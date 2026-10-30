# Multi-Language Backend Patterns

## Overview
This reference documents idiomatic backend patterns across TypeScript, Python, Go, and Rust. Each section shows the same core concepts (HTTP handlers, database access, error handling, middleware) implemented in each language's preferred framework.

---

## 1. TypeScript (Hono + Drizzle ORM)

### Project Structure
```
src/
├── index.ts           # Entry point
├── routes/
│   ├── products.ts    # Product routes
│   └── users.ts       # User routes
├── db/
│   ├── index.ts       # Database client
│   └── schema.ts      # Drizzle schema
├── middleware/
│   ├── auth.ts        # JWT auth middleware
│   └── logger.ts      # Request logger
├── services/
│   └── product.ts     # Business logic
└── lib/
    ├── errors.ts      # Custom error classes
    └── validators.ts  # Zod schemas
```

### HTTP Handler + Validation

```typescript
// routes/products.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { products } from '../db/schema';
import { eq } from 'drizzle-orm';

const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
});

const app = new Hono()
  .get('/', async (c) => {
    const limit = Number(c.req.query('limit') ?? '20');
    const cursor = c.req.query('cursor');

    const items = await db
      .select()
      .from(products)
      .orderBy(products.createdAt)
      .limit(limit + 1);

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;

    return c.json({ data, hasMore });
  })
  .post('/', zValidator('json', CreateProductSchema), async (c) => {
    const input = c.req.valid('json');

    const [product] = await db
      .insert(products)
      .values(input)
      .returning();

    return c.json(product, 201);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    return c.json(product);
  });

export default app;
```

---

## 2. Python (FastAPI + SQLAlchemy 2.x)

### Project Structure
```
app/
├── main.py            # Entry point
├── routes/
│   ├── products.py    # Product routes
│   └── users.py       # User routes
├── db/
│   ├── session.py     # Database session
│   └── models.py      # SQLAlchemy models
├── schemas/
│   └── product.py     # Pydantic schemas
├── services/
│   └── product.py     # Business logic
└── middleware/
    ├── auth.py        # JWT auth dependency
    └── logging.py     # Request logging
```

### HTTP Handler + Validation

```python
# routes/products.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Product
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductListResponse,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=ProductListResponse)
async def list_products(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).order_by(Product.created_at).limit(limit + 1)

    if category:
        query = query.where(Product.category_id == category)

    result = await db.execute(query)
    items = list(result.scalars().all())

    has_more = len(items) > limit
    data = items[:limit] if has_more else items

    return ProductListResponse(data=data, has_more=has_more)


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product
```

### Pydantic Schema

```python
# schemas/product.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: float = Field(gt=0)
    category_id: UUID


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    price: float
    category_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    data: list[ProductResponse]
    has_more: bool
```

---

## 3. Go (Gin + sqlc)

### Project Structure
```
cmd/
└── server/
    └── main.go        # Entry point
internal/
├── handler/
│   ├── products.go    # Product handlers
│   └── users.go       # User handlers
├── db/
│   ├── db.go          # Database connection
│   ├── queries.sql    # SQL queries (for sqlc)
│   └── sqlc/          # Generated code
├── middleware/
│   ├── auth.go        # JWT auth middleware
│   └── logger.go      # Request logging
├── service/
│   └── product.go     # Business logic
└── model/
    └── product.go     # Domain types
```

### HTTP Handler

```go
// internal/handler/products.go
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/example/api/internal/db/sqlc"
)

type ProductHandler struct {
	queries *sqlc.Queries
}

func NewProductHandler(q *sqlc.Queries) *ProductHandler {
	return &ProductHandler{queries: q}
}

type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required,min=1,max=255"`
	Description *string `json:"description"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	CategoryID  string  `json:"category_id" binding:"required,uuid"`
}

func (h *ProductHandler) ListProducts(c *gin.Context) {
	limit := 20 // Default
	products, err := h.queries.ListProducts(c, sqlc.ListProductsParams{
		Limit: int32(limit + 1),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	hasMore := len(products) > limit
	if hasMore {
		products = products[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     products,
		"has_more": hasMore,
	})
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	categoryID, _ := uuid.Parse(req.CategoryID)
	product, err := h.queries.CreateProduct(c, sqlc.CreateProductParams{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		CategoryID:  categoryID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) GetProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	product, err := h.queries.GetProduct(c, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}
```

---

## 4. Rust (Axum + SQLx)

### Project Structure
```
src/
├── main.rs            # Entry point
├── routes/
│   ├── mod.rs
│   ├── products.rs    # Product routes
│   └── users.rs       # User routes
├── db/
│   ├── mod.rs
│   └── models.rs      # Database models
├── middleware/
│   ├── mod.rs
│   └── auth.rs        # JWT auth layer
├── services/
│   ├── mod.rs
│   └── product.rs     # Business logic
└── error.rs           # Custom error types
```

### HTTP Handler + Validation

```rust
// src/routes/products.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub limit: Option<i64>,
    pub cursor: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub category_id: Uuid,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Product {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub category_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize)]
pub struct ProductListResponse {
    pub data: Vec<Product>,
    pub has_more: bool,
}

pub async fn list_products(
    State(pool): State<PgPool>,
    Query(params): Query<ListParams>,
) -> Result<Json<ProductListResponse>, AppError> {
    let limit = params.limit.unwrap_or(20).min(100);

    let products = sqlx::query_as::<_, Product>(
        "SELECT * FROM products ORDER BY created_at LIMIT $1"
    )
    .bind(limit + 1)
    .fetch_all(&pool)
    .await?;

    let has_more = products.len() as i64 > limit;
    let data = if has_more {
        products[..limit as usize].to_vec()
    } else {
        products
    };

    Ok(Json(ProductListResponse { data, has_more }))
}

pub async fn create_product(
    State(pool): State<PgPool>,
    Json(input): Json<CreateProductRequest>,
) -> Result<(StatusCode, Json<Product>), AppError> {
    if input.name.is_empty() || input.price <= 0.0 {
        return Err(AppError::Validation("Invalid product data".into()));
    }

    let product = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (name, description, price, category_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.price)
    .bind(input.category_id)
    .fetch_one(&pool)
    .await?;

    Ok((StatusCode::CREATED, Json(product)))
}

pub async fn get_product(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Product>, AppError> {
    let product = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(product))
}
```

### Custom Error Type

```rust
// src/error.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    NotFound,
    Validation(String),
    Database(sqlx::Error),
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "Resource not found".to_string()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err)
    }
}
```

---

## Language Selection Guide

| Criteria | TypeScript | Python | Go | Rust |
|----------|-----------|--------|-----|------|
| **Best for** | Full-stack web apps | ML/AI, data pipelines | High-concurrency services | Systems, performance-critical |
| **Ecosystem** | Largest (npm) | Rich (ML/data) | Growing | Growing |
| **Performance** | Good (V8/Bun) | Moderate (async) | Excellent | Best |
| **Type Safety** | Good (strict TS) | Good (Pydantic) | Built-in | Best (compiler) |
| **Concurrency** | Event loop | asyncio/threading | Goroutines | async/tokio |
| **Learning Curve** | Low | Low | Medium | High |
| **Deploy Size** | Medium | Medium | Small (static) | Smallest (static) |
| **Startup Time** | Fast | Moderate | Very fast | Very fast |

---

## Conclusion
Choose the right language for the right job. TypeScript for rapid full-stack development, Python for data-heavy workloads, Go for high-concurrency microservices, and Rust for performance-critical systems. The patterns (validation, error handling, middleware) remain consistent across all languages.
