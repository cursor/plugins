---
name: mvc-expert
description: "Expert guidelines to refactor legacy PHP codebases into clean, modern, and scalable MVC-structured projects / Pedoman ahli untuk merefaktor codebase PHP lama menjadi proyek terstruktur MVC yang bersih, modern, dan skalabel."
author: "Roedy Rustam"
version: "4.3.0"
---

# PHP MVC Expert & Modernization

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
This skill provides the agent with structured protocols, coding patterns, and architectural guidelines to audit, refactor, and modernize legacy/obsolete PHP codebases (plain spaghetti PHP) into a clean, modern, secure, and scalable Model-View-Controller (MVC) structure adhering to PSR standards and modern PHP (v8.2+) capabilities.

### Instructions

#### 1. Audit Protocol for Legacy PHP
Before writing new structures, run a detailed audit on the legacy files to map out:
- **Routing & Entry Points**: Identify raw `.php` files acting as endpoints (e.g., `about.php`, `contact.php`, `process.php`).
- **Data Access & SQL**: Find inline SQL queries, string-concatenated queries (SQL Injection risks), and direct `mysqli` or `mysql_*` usages.
- **Session & Global State**: Identify direct session mutations (`$_SESSION`), raw cookies, and unchecked global variables (`$_GET`, `$_POST`, `$_REQUEST`).
- **Spaghetti Mixing**: Locate files where database connection, business logic, session validation, and HTML rendering are in a single script.
- **Hardcoded Secrets**: Identify database credentials, API keys, and configurations defined inside individual files.

#### 2. Modernization Strategy & Composer Setup
Apply a standard project directory structure and initialize dependency management:
- **PSR-4 Autoloading**: Create a `composer.json` file and define namespace mappings:
  ```json
  {
    "autoload": {
      "psr-4": {
        "App\\": "src/"
      }
    }
  }
  ```
- **Standard Directory Structure**:
  - `public/`: Single entry point containing `index.php` (Front Controller), assets (CSS, JS), and uploaded files.
  - `src/`: Root namespace for MVC structure (`src/Models/`, `src/Controllers/`, `src/Views/`, `src/Core/`).
  - `config/`: Database configurations, router configurations, and app configurations.
  - `.env` & `.env.example`: Store environment configurations.

#### 3. Implementing MVC Architecture
Refactor the spaghetti code into distinct MVC layers:
- **Front Controller (Unified Routing)**:
  Use a clean routing engine (like AltoRouter or a lightweight custom router) in `public/index.php`. Map all requests through a single file using `.htaccess` or server redirects:
  ```php
  // public/index.php
  require_once __DIR__ . '/../vendor/autoload.php';
  
  $router = new App\Core\Router();
  $router->add('GET', '/', 'HomeController@index');
  $router->add('GET', '/users', 'UserController@index');
  $router->dispatch($_SERVER['REQUEST_URI'], $_SERVER['REQUEST_METHOD']);
  ```
- **Models**:
  Isolate all database access inside Model classes. Implement prepared statements using PDO:
  ```php
  namespace App\Models;
  use App\Core\Database;
  use PDO;

  class User {
      private PDO $db;
      public function __construct() {
          $this->db = Database::getInstance()->getConnection();
      }
      public function getAll(): array {
          $stmt = $this->db->prepare("SELECT id, name, email FROM users ORDER BY name ASC");
          $stmt->execute();
          return $stmt->fetchAll(PDO::FETCH_ASSOC);
      }
  }
  ```
- **Controllers**:
  Extract requests and input parameters, invoke models, and return/render views:
  ```php
  namespace App\Controllers;
  use App\Models\User;

  class UserController {
      public function index(): void {
          $model = new User();
          $users = $model->getAll();
          render_view('users/index', ['users' => $users]);
      }
  }
  ```
- **Views**:
  Never echo HTML directly in controllers. Implement clean PHP template rendering or integrate a lightweight template engine like Twig. Ensure all HTML output is properly escaped.

#### 4. Security Enhancements
Integrate the following standard security gates during refactoring:
- **SQL Injection Prevention**: Enforce prepared statements with parameters for every SQL query.
- **XSS Prevention**: Build or use a global escape helper (e.g., `htmlspecialchars($str, ENT_QUOTES, 'UTF-8')`) for all dynamic view output.
- **CSRF Protection**: Generate and validate CSRF tokens for all state-changing requests (`POST`, `PUT`, `DELETE`).
- **Secrets Management**: Load configuration via `.env` files using `vlucas/phpdotenv`.

#### 5. Leveraging Modern PHP (v8.2+)
Refactor old PHP logic to use modern constructs:
- **Constructor Property Promotion** and **Typed Properties**.
- **Readonly Classes** for immutable service/data classes.
- **Strict Types Declaration**: Add `declare(strict_types=1);` to all class files.

#### 6. Multi-Page Application (MPA) Approach in a Single Repository
When organizing a project as a Multi-Page Application within a single repository, adhere to the following guidelines:
- **Centralized Routing**: Use the Front Controller (`public/index.php`) to handle all page requests. Route each request to its respective controller and view, ensuring each page load is fully processed on the server side.
- **Shared Layouts & Partials**: Avoid duplicating HTML (headers, footers, navigation). Create a `src/Views/layouts/` directory for base templates and a `src/Views/partials/` directory for reusable UI components. Controllers should inject page-specific content into the base layout.
- **Asset Management**: Store all static assets (CSS, JS, images) in the `public/` directory. Use cache-busting techniques (e.g., appending file modification time `?v=123`) when linking assets in the views.
- **State Management**: Use server-side sessions securely for user authentication, flash messages, and tracking state across full page reloads.

### Trigger Conditions
Active whenever the user requests to:
- Modernize a legacy PHP project or spaghetti PHP script.
- Design an MVC architecture or introduce a clean routing pattern in plain PHP.
- Implement object-oriented programming (OOP), Composer namespaces (PSR-4), or clean up database access via PDO in a PHP application.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Skill ini memberikan protokol terstruktur, pola penulisan kode, dan panduan arsitektur bagi agen untuk melakukan audit, refaktorisasi, dan modernisasi terhadap codebase PHP lama yang usang (Plain Spaghetti PHP) menjadi struktur Model-View-Controller (MVC) yang bersih, modern, aman, dan skalabel yang mematuhi standar PSR serta kemampuan PHP modern (v8.2+).

### Instruksi

#### 1. Protokol Audit Kode PHP Lama
Sebelum membuat struktur baru, jalankan langkah audit terperinci pada file-file proyek lama untuk memetakan:
- **Titik Entri & Routing**: Identifikasi file-file `.php` mentah yang bertindak langsung sebagai endpoint (misal `about.php`, `contact.php`, `process.php`).
- **Akses Data & SQL**: Cari query SQL inline, penggabungan query menggunakan string concatenation (berisiko SQL Injection), dan penggunaan langsung `mysqli` atau `mysql_*`.
- **Session & State Global**: Identifikasi mutasi langsung session (`$_SESSION`), cookie mentah, dan variabel global yang tidak divalidasi (`$_GET`, `$_POST`, `$_REQUEST`).
- **Pencampuran Logika (Spaghetti)**: Temukan file di mana koneksi database, logika bisnis, validasi session, dan render HTML berada dalam satu berkas tunggal.
- **Secret Hardcoded**: Identifikasi kredensial database, API key, dan konfigurasi lainnya yang didefinisikan di dalam file.

#### 2. Strategi Modernisasi & Konfigurasi Composer
Terapkan struktur direktori proyek standar dan inisialisasi manajemen dependensi:
- **PSR-4 Autoloading**: Buat file `composer.json` dan definisikan pemetaan namespace:
  ```json
  {
    "autoload": {
      "psr-4": {
        "App\\": "src/"
      }
    }
  }
  ```
- **Struktur Direktori Standar**:
  - `public/`: Titik entri tunggal yang berisi `index.php` (Front Controller), aset (CSS, JS), serta file upload.
  - `src/`: Namespace root untuk struktur MVC (`src/Models/`, `src/Controllers/`, `src/Views/`, `src/Core/`).
  - `config/`: Konfigurasi database, konfigurasi router, dan konfigurasi aplikasi.
  - `.env` & `.env.example`: Menyimpan konfigurasi environment.

#### 3. Menerapkan Arsitektur MVC
Refaktorkan kode spageti ke dalam lapisan MVC yang terpisah:
- **Front Controller (Routing Terpusat)**:
  Gunakan library routing yang bersih (seperti AltoRouter atau router kustom ringan) di `public/index.php`. Arahkan semua request melalui satu file menggunakan `.htaccess` atau pengalihan server:
  ```php
  // public/index.php
  require_once __DIR__ . '/../vendor/autoload.php';
  
  $router = new App\Core\Router();
  $router->add('GET', '/', 'HomeController@index');
  $router->add('GET', '/users', 'UserController@index');
  $router->dispatch($_SERVER['REQUEST_URI'], $_SERVER['REQUEST_METHOD']);
  ```
- **Models**:
  Pisahkan semua akses database di dalam kelas Model. Gunakan prepared statements dengan PDO:
  ```php
  namespace App\Models;
  use App\Core\Database;
  use PDO;

  class User {
      private PDO $db;
      public function __construct() {
          $this->db = Database::getInstance()->getConnection();
      }
      public function getAll(): array {
          $stmt = $this->db->prepare("SELECT id, name, email FROM users ORDER BY name ASC");
          $stmt->execute();
          return $stmt->fetchAll(PDO::FETCH_ASSOC);
      }
  }
  ```
- **Controllers**:
  Ekstrak request dan parameter input, panggil model, lalu return/render view:
  ```php
  namespace App\Controllers;
  use App\Models\User;

  class UserController {
      public function index(): void {
          $model = new User();
          $users = $model->getAll();
          render_view('users/index', ['users' => $users]);
      }
  }
  ```
- **Views**:
  Jangan pernah me-render atau menggunakan `echo` HTML langsung di dalam controller. Terapkan render template PHP yang bersih atau gunakan template engine ringan seperti Twig. Pastikan semua output HTML divalidasi dan lolos proses escaping.

#### 4. Peningkatan Keamanan
Integrasikan filter keamanan standar berikut selama refaktorisasi:
- **Pencegahan SQL Injection**: Wajibkan prepared statements dengan parameter terikat untuk setiap query SQL.
- **Pencegahan XSS**: Buat atau gunakan fungsi helper escape global (misal `htmlspecialchars($str, ENT_QUOTES, 'UTF-8')`) pada setiap output dinamis pada view.
- **Proteksi CSRF**: Hasilkan dan validasi token CSRF untuk setiap request yang mengubah state data (`POST`, `PUT`, `DELETE`).
- **Manajemen Secrets**: Muat konfigurasi via file `.env` menggunakan library `vlucas/phpdotenv`.

#### 5. Memanfaatkan PHP Modern (v8.2+)
Refaktorkan logika PHP lama agar menggunakan fitur modern:
- **Constructor Property Promotion** dan **Typed Properties** untuk properti kelas.
- **Readonly Classes** untuk kelas layanan atau data yang bersifat immutable (tidak dapat diubah).
- **Deklarasi Strict Types**: Tambahkan `declare(strict_types=1);` di bagian paling atas setiap file kelas.

#### 6. Pendekatan Multi-Page Application (MPA) dalam Satu Repositori
Saat mengatur proyek sebagai Multi-Page Application di dalam satu repositori, ikuti panduan berikut:
- **Routing Terpusat (Centralized Routing)**: Gunakan Front Controller (`public/index.php`) untuk menangani semua permintaan halaman. Arahkan setiap permintaan ke controller dan view masing-masing, memastikan setiap pemuatan halaman diproses sepenuhnya di sisi server.
- **Layout & Parsial Bersama (Shared Layouts & Partials)**: Hindari duplikasi HTML (header, footer, navigasi). Buat direktori `src/Views/layouts/` untuk template dasar dan direktori `src/Views/partials/` untuk komponen UI yang dapat digunakan kembali. Controller harus menyuntikkan konten spesifik halaman ke dalam layout dasar.
- **Manajemen Aset**: Simpan semua aset statis (CSS, JS, gambar) di direktori `public/`. Gunakan teknik cache-busting (misalnya, menambahkan waktu modifikasi file `?v=123`) saat menautkan aset di dalam view.
- **Manajemen State**: Gunakan session sisi server secara aman untuk autentikasi pengguna, pesan flash, dan melacak state di seluruh proses reload halaman secara penuh.

### Kondisi Pemicu
Aktif setiap kali pengguna meminta untuk:
- Memodernisasi proyek PHP lama atau script PHP spageti.
- Merancang arsitektur MVC atau memperkenalkan pola routing yang bersih di plain PHP.
- Menerapkan pemrograman berorientasi objek (OOP), namespace Composer (PSR-4), atau membersihkan akses database via PDO pada aplikasi PHP.