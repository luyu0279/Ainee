# Ainee

Ainee is a highly customizable AI assistant designed to transform how you capture, organize, and engage with your study materials—whether they are audio, text, files, YouTube videos, or more. It is a free alternative to products like NotebookLM, Fabric, and MyMind.

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Use Cases](#use-cases)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
  - [1. Database Setup](#1-database-setup)
  - [2. Python Backend Setup](#2-python-backend-setup)
  - [3. Node.js Services Setup](#3-nodejs-services-setup)
- [Acknowledgments](#acknowledgments)

---

## Introduction

Traditional note-taking and learning tools often fall short in capturing and organizing information efficiently. Ainee elevates this experience by integrating AI with your personal learning environment. It enables dynamic interaction with knowledge, breaking down barriers to accessing and engaging with various forms of information.

---

## Features

- **🎯 Unified Knowledge Base**  
  Save and organize all your content—web pages, text, images, audio, video, and files—into a single, easily searchable repository.

- **📚 Multi-Format File Support**  
  Seamlessly transform audio, text, PDFs, and YouTube videos into structured notes and summaries.

- **📝 Real-Time Note-Taking**  
  Instantly capture lecture notes, meetings, or any spoken content with our AI-powered voice recorder.

- **🧠 AI-Enhanced Reading and Learning**  
  Turn imported content into powerful insights with AI-generated mind maps, summaries, flashcards, and more.

- **💬 Chat with Your Knowledge Base**  
  Engage with your content using AI chat, receiving insights and answers complete with references.

- **🌐 Collaborative Sharing**  
  Share your knowledge base to promote collaborative learning and distribute comprehensive insights.

- **📖 Community Content Library**  
  Access an expanding library of user-generated content to broaden your learning experience.

### External Integrations

- **Audio and Video Sources:** YouTube, Podcasts
- **Document Formats:** PDF, Word, Text Files
- **And More to Come!**

---

## Use Cases

- **Students:** Capture lecture notes, organize study materials, and create study aids.
- **Researchers:** Collect sources, compile notes, and share valuable insights.
- **Professionals:** Organize project information and generate meeting notes.
- **Lifelong Learners:** Save, organize, and share interesting content for continuous learning.
- **Content Creators:** Prepare podcast episodes, gather content, and store inspiration efficiently.

---

## Project Structure

- `app/` - Main Python backend application
- `web_crawler/` - Node.js web crawler service
- `web/` - Web frontend

---

## Prerequisites

- Python 3.11
- Node.js 19+
- pnpm (for Node.js package management)
- Docker (recommended for database setup)
- PostgreSQL 14+ (if not using Docker)
- Redis 6+ (if not using Docker)

---

## Development Setup

### 1. Database Setup

#### Using Docker

```bash
# Create a Docker network for the services
docker network create ainee-network

# Start PostgreSQL
docker run -d \
  --name ainee-postgres \
  --network ainee-network \
  -e POSTGRES_DB=ainee \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -v $(pwd)/data:/docker-entrypoint-initdb.d \
  postgres:14

# Start Redis
docker run -d \
  --name ainee-redis \
  --network ainee-network \
  -p 6399:6379 \
  redis:6

# Restore database
docker cp data/ainee_localhost-2025_05_21_18_08_33-dump.sql ainee-postgres:/tmp/
docker exec -it ainee-postgres psql -U postgres -d ainee -f /tmp/ainee_localhost-2025_05_21_18_08_33-dump.sql
```

To stop and remove containers:

```bash
docker stop ainee-postgres ainee-redis
docker rm ainee-postgres ainee-redis
docker network rm ainee-network
```

---

### 2. Python Backend Setup

```bash
# Clone the repository
git clone <repository-url>
cd ainee

# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# .\venv\Scripts\activate  # On Windows

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

> **Note:** For the backend to interact with Firebase services (like authentication), you need to configure the Firebase Admin SDK using a service account. Ensure *all* necessary service account credentials (e.g., private key, client email, client id, etc.) are set as environment variables in your `.env` file. Refer to the `init_firebase_credential` function in `app/libs/firebase/index.py` to identify the specific credentials required and how they are used.

# Install Python dependencies
pip install -r requirements.txt
```

#### Start the backend service (main app and Celery workers):

In separate terminals:

```bash
# Start the main app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start the content worker
celery -A app.workers.content worker -l info -c 4 -Q content_queue -n content_worker@%h

# Start the rag worker
celery -A app.workers.rag worker -l info -c 4 -Q rag_queue -n rag_worker@%h
```

> **Note:** You must run the main app and both Celery workers (content-worker and rag-parser) at the same time for full functionality.

#### RagFlow Dependency

The `rag_worker` Celery worker relies on a deployed instance of [RagFlow](https://github.com/infiniflow/ragflow), an open-source RAG engine.  
Please refer to the [RagFlow documentation](https://github.com/infiniflow/ragflow) for setup instructions.

---

### 3. Node.js Services Setup

#### Ainee Web Service

> **Note:** For web login functionality, ensure you have configured Firebase with your project details. You can find the configuration in `web/src/lib/firebase.ts`.

```bash
cd app/api/ainee_web
pnpm install
pnpm dev
```

#### Web Crawler Service

```bash
cd web_crawler
pnpm install
pnpm dev
```

---

## Acknowledgments

This project utilizes [RagFlow](https://github.com/infiniflow/ragflow), an open-source RAG (Retrieval-Augmented Generation) engine for deep document understanding.

---

