# Skill: Designing MongoDB Schemas and Indexes

## Description

This skill covers the complete workflow for designing MongoDB document schemas and indexes, including choosing embedding vs referencing strategies, applying common MongoDB design patterns, creating effective indexes, and validating schema design decisions.

## Prerequisites

- A running MongoDB instance (local, Docker, or Atlas)
- Basic understanding of the application's data entities and access patterns
- Node.js + Mongoose or the native MongoDB driver installed

## Steps

### 1. Identify Entities and Access Patterns

Before writing any schema, document your application's data requirements:

```markdown
## Entity: Product
- Fields: name, description, price, category, tags, inventory, images, reviews
- Read patterns:
  - List products by category (high frequency)
  - Search products by name/tags (high frequency)
  - Get product detail with recent reviews (high frequency)
  - Get all reviews for a product (medium frequency)
- Write patterns:
  - Create/update product info (low frequency)
  - Add review (medium frequency)
  - Update inventory (high frequency)
- Cardinality:
  - Products: ~10,000
  - Reviews per product: 0–10,000 (unbounded)
  - Images per product: 1–10 (bounded)
  - Tags per product: 1–20 (bounded)
```

### 2. Choose Embedding vs Referencing

Apply these decision rules for each relationship:

| Criterion | Embed | Reference |
|-----------|-------|-----------|
| Read together with parent? | Yes → Embed | No → Reference |
| Cardinality | Bounded (1:few) → Embed | Unbounded (1:many, many:many) → Reference |
| Updated independently? | No → Embed | Yes → Reference |
| Queried independently? | No → Embed | Yes → Reference |
| Document size risk? | Under 16MB → Embed | Near or over → Reference |
| Data duplication acceptable? | Yes → Embed / Extended Ref | No → Reference |

**Example decision for Product:**

```
- Images (1:few, bounded, read together) → EMBED
- Tags (1:few, bounded, read together) → EMBED
- Reviews (1:many, unbounded, queried independently) → REFERENCE
  - Apply Subset Pattern: embed latest 3 reviews for fast display
- Category (many:1, shared, queried independently) → REFERENCE
  - Apply Extended Reference: embed category name for display
```

### 3. Design the Schema

Translate your decisions into Mongoose schemas:

```typescript
import { Schema, model, Types } from 'mongoose';

// --- Category (referenced by products) ---
const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });

export const Category = model('Category', categorySchema);

// --- Review (separate collection, referenced by product) ---
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, maxlength: 5000 },
  helpful: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index: one review per user per product
reviewSchema.index({ product: 1, author: 1 }, { unique: true });
// For sorting reviews on product page
reviewSchema.index({ product: 1, createdAt: -1 });

export const Review = model('Review', reviewSchema);

// --- Product (main entity) ---
const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  price: { type: Schema.Types.Decimal128, required: true },
  compareAtPrice: Schema.Types.Decimal128,
  currency: { type: String, default: 'USD', enum: ['USD', 'EUR', 'GBP'] },
  sku: { type: String, unique: true, sparse: true },

  // REFERENCE with Extended Reference Pattern — embed category name for display
  category: {
    _id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: String,
    slug: String,
  },

  // EMBED — bounded, always read together
  tags: [{ type: String, lowercase: true, trim: true }],
  images: [{
    url: { type: String, required: true },
    alt: String,
    isPrimary: { type: Boolean, default: false },
  }],

  // SUBSET PATTERN — embed recent reviews, full reviews in separate collection
  recentReviews: [{
    _id: Schema.Types.ObjectId,
    author: String,
    rating: Number,
    title: String,
    createdAt: Date,
  }],

  // Computed values (Computed Pattern)
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },

  // Inventory
  inventory: {
    quantity: { type: Number, required: true, default: 0, min: 0 },
    warehouse: String,
    lowStockThreshold: { type: Number, default: 10 },
  },

  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
}, { timestamps: true });

export const Product = model('Product', productSchema);
```

### 4. Design Indexes

Create indexes that support your identified query patterns:

```typescript
// --- Product Indexes ---

// List products by category (high frequency)
productSchema.index({ 'category._id': 1, status: 1, createdAt: -1 });

// Search products by tags
productSchema.index({ tags: 1 });

// Filter by status + sort by price
productSchema.index({ status: 1, price: 1 });

// Text search on name and description
productSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  { weights: { name: 10, tags: 5, description: 1 }, name: 'idx_product_text_search' }
);

// Inventory alerts: find low-stock products
productSchema.index(
  { 'inventory.quantity': 1, status: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Unique slug
productSchema.index({ slug: 1 }, { unique: true });

// --- Category Indexes ---
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentCategory: 1 });

// --- Review Indexes ---
// Already defined above: { product: 1, author: 1 } unique
// Already defined above: { product: 1, createdAt: -1 }
reviewSchema.index({ author: 1, createdAt: -1 });  // user's review history
```

### 5. Implement Common Operations

#### Add a Review (with Subset Pattern Update)

```typescript
import { Types } from 'mongoose';

async function addReview(
  productId: string,
  authorId: string,
  data: { rating: number; title: string; body?: string }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create the review
    const [review] = await Review.create([{
      product: new Types.ObjectId(productId),
      author: new Types.ObjectId(authorId),
      ...data,
    }], { session });

    // 2. Update product: recalculate average, update recent reviews
    const stats = await Review.aggregate([
      { $match: { product: new Types.ObjectId(productId) } },
      { $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      }},
    ]).session(session);

    const recentReviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('author rating title createdAt')
      .populate('author', 'name')
      .session(session)
      .lean();

    await Product.findByIdAndUpdate(productId, {
      $set: {
        averageRating: Math.round((stats[0]?.avgRating ?? 0) * 10) / 10,
        reviewCount: stats[0]?.count ?? 0,
        recentReviews: recentReviews.map(r => ({
          _id: r._id,
          author: (r.author as any).name,
          rating: r.rating,
          title: r.title,
          createdAt: r.createdAt,
        })),
      },
    }, { session });

    await session.commitTransaction();
    return review;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

#### Cursor-Based Product Listing

```typescript
async function listProducts(categoryId: string, cursor?: string, limit = 20) {
  const query: any = {
    'category._id': new Types.ObjectId(categoryId),
    status: 'active',
  };

  if (cursor) {
    query._id = { $lt: new Types.ObjectId(cursor) };
  }

  const products = await Product.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select('name slug price currency images averageRating reviewCount')
    .lean();

  const hasNext = products.length > limit;
  const items = hasNext ? products.slice(0, -1) : products;
  const nextCursor = hasNext ? items[items.length - 1]._id.toString() : null;

  return { items, nextCursor, hasNext };
}
```

### 6. Validate Schema with explain()

Verify that your indexes support your queries:

```typescript
// Check category listing query
const plan = await Product.find({
  'category._id': categoryId,
  status: 'active',
})
  .sort({ _id: -1 })
  .limit(20)
  .explain('executionStats');

const stats = plan.executionStats;
console.log({
  executionTimeMs: stats.executionTimeMillis,
  totalDocsExamined: stats.totalDocsExamined,
  totalKeysExamined: stats.totalKeysExamined,
  nReturned: stats.nReturned,
  indexUsed: stats.executionStages.inputStage?.indexName ?? 'NONE',
});

// GOOD: totalDocsExamined ≈ nReturned, stage = IXSCAN
// BAD: totalDocsExamined >> nReturned or stage = COLLSCAN
```

### 7. Add Collection Validation (Native Driver)

For additional safety, add JSON Schema validation at the database level:

```javascript
db.runCommand({
  collMod: 'products',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug', 'price', 'category', 'status'],
      properties: {
        name: { bsonType: 'string', minLength: 1, maxLength: 500 },
        slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
        price: { bsonType: 'decimal' },
        status: { bsonType: 'string', enum: ['draft', 'active', 'archived'] },
        'inventory.quantity': { bsonType: 'int', minimum: 0 },
      },
    },
  },
  validationLevel: 'moderate',  // only validate inserts and updates to valid docs
  validationAction: 'error',
});
```

### 8. Monitor Index Usage

Periodically check that all indexes are being used:

```javascript
// Check index usage statistics
db.products.aggregate([{ $indexStats: {} }]).forEach(stat => {
  console.log(`${stat.name}: ${stat.accesses.ops} operations since ${stat.accesses.since}`);
});

// Drop unused indexes (after verifying they're truly unused)
// db.products.dropIndex('index_name');
```

## Verification

After designing your schema:

1. **Verify all queries use indexes:**
   ```bash
   mongosh --eval "db.products.find({'category._id': ObjectId('...')}).explain('executionStats')"
   ```

2. **Check document sizes are within bounds:**
   ```bash
   mongosh --eval "db.products.aggregate([{\$project: {size: {\$bsonSize: '$$ROOT'}}}, {\$sort: {size: -1}}, {\$limit: 5}])"
   ```

3. **Validate schema enforcement:**
   ```bash
   mongosh --eval "db.getCollectionInfos({name: 'products'})[0].options.validator"
   ```

4. **Test all CRUD operations** in application code and verify expected behavior.

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Unbounded array growth | Reference instead of embed; use Bucket or Subset pattern |
| Missing indexes on query fields | Run `explain()` on all frequent queries; add compound indexes |
| Redundant indexes | `{ a: 1, b: 1 }` covers `{ a: 1 }` — drop the single-field index |
| Monotonic shard keys | Use hashed or compound shard keys for even distribution |
| Deep nesting (>3 levels) | Flatten schema or extract to separate collection |
| Storing ObjectId as string | Always use `Schema.Types.ObjectId` / `new ObjectId()` |
| No validation on collections | Add JSON Schema validators or Mongoose validators |
| Over-populating in Mongoose | Use `$lookup` in aggregation for complex joins instead of chained `.populate()` |
