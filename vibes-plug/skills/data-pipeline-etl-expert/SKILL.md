---
name: data-pipeline-etl-expert
description: "Expert guide for Data Pipelines, ETL/ELT, and Analytics Engineering. Covers dbt, Apache Airflow, Dagster, BigQuery, ClickHouse, and DuckDB / Panduan ahli untuk Data Pipelines, ETL/ELT. Mencakup dbt, Airflow, Dagster, BigQuery, ClickHouse, dan DuckDB."
author: "Roedy Rustam"
version: "4.3.0"
---

# Data Pipeline & ETL Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
A specialized skill for building robust data architectures, Analytics Engineering, and ETL (Extract, Transform, Load) or ELT pipelines. It covers modern data stack orchestration (Airflow, Dagster), transformation tools (dbt), and high-performance OLAP databases (BigQuery, Snowflake, ClickHouse, DuckDB).

### Trigger Conditions
- When designing reporting dashboards or analytics infrastructure for a SaaS.
- When moving large volumes of data from transactional databases (PostgreSQL/MySQL) to a data warehouse.
- When the user asks about "dbt", "Airflow", "ELT", or "Analytics Engineering".
- When building local or edge analytics using DuckDB.

### Core Architectural Guidelines

#### 1. ELT over ETL
Prefer Extract-Load-Transform (ELT) over traditional ETL.
- **Extract & Load**: Use tools like Airbyte or Fivetran to dump raw data directly into the Data Warehouse.
- **Transform**: Perform transformations *inside* the Data Warehouse using SQL (via dbt) to leverage the warehouse's massive compute power.

#### 2. Analytics Engineering with dbt
Treat SQL like software engineering.
- Use `dbt` (Data Build Tool) to version control your SQL transformations.
- Implement tests (`not_null`, `unique`) on critical tables.
- Use Jinja templating in dbt to DRY up complex SQL queries.

#### 3. Data Orchestration (Airflow vs Dagster)
- **Apache Airflow**: The industry standard for scheduling and monitoring complex DAGs (Directed Acyclic Graphs). Best for Python-heavy teams.
- **Dagster**: A modern alternative focused on data assets rather than just tasks. Use Dagster when you want better local testing and asset-driven lineage.

#### 4. OLAP Database Selection
- **BigQuery / Snowflake**: Best for massive scale, fully managed cloud data warehousing.
- **ClickHouse**: Best for real-time, sub-second analytical queries on massive event streams.
- **DuckDB**: Best for local analytics, embedded analytical pipelines, or processing parquets in edge environments (Node.js/Python).

## Orchestration & Integration
- Pairs with `data-telemetry-expert` to process the raw telemetry events captured by PostHog/OpenTelemetry.
- Complements `python-programming-expert` as Python is the lingua franca of data engineering.
- Works with `cron-scheduler-expert` when simpler, non-DAG cron jobs are sufficient for small ETL tasks.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan khusus untuk membangun arsitektur data yang kuat, Analytics Engineering, dan pipeline ETL/ELT. Mencakup orkestrasi (Airflow, Dagster), alat transformasi (dbt), dan database OLAP berkinerja tinggi (BigQuery, Snowflake, ClickHouse, DuckDB).

### Kondisi Pemicu
- Saat merancang infrastruktur analitik atau dashboard pelaporan untuk SaaS.
- Saat memindahkan data bervolume besar dari database transaksional ke Data Warehouse.
- Saat membangun analitik lokal yang cepat menggunakan DuckDB.

### Panduan Arsitektur Inti

#### 1. ELT lebih disukai daripada ETL
- **Extract & Load**: Pindahkan data mentah (raw data) langsung ke Data Warehouse (menggunakan Airbyte/Fivetran).
- **Transform**: Lakukan transformasi data *di dalam* Data Warehouse menggunakan SQL (dbt) untuk memanfaatkan kekuatan komputasi gudang data yang masif.

#### 2. Analytics Engineering dengan dbt (Data Build Tool)
Perlakukan transformasi data (SQL) layaknya rekayasa perangkat lunak. Gunakan dbt untuk version control, pengujian otomatis (`not_null`, `unique`), dan dokumentasi skema data Anda.

#### 3. Orkestrasi Data (DAG)
Gunakan Apache Airflow atau Dagster untuk menjadwalkan dan memonitor alur kerja data yang kompleks (DAG). Dagster sangat direkomendasikan untuk pendekatan modern yang berpusat pada aset data (asset-driven orchestration).

#### 4. Pemilihan Database OLAP
- **BigQuery / Snowflake**: Gudang data cloud fully-managed untuk analitik skala masif.
- **ClickHouse**: Sangat cepat untuk kueri analitik real-time. Cocok untuk data event stream/log.
- **DuckDB**: SQLite untuk analitik. Sangat cepat untuk memproses file Parquet atau CSV secara lokal maupun di lingkungan edge/serverless (via Python/Node.js).

## Integrasi Orkestrasi
- Bekerja sama dengan `data-telemetry-expert` untuk memproses data mentah yang dikumpulkan.
- Melengkapi `python-programming-expert` dalam menulis skrip orkestrasi Airflow/Dagster.