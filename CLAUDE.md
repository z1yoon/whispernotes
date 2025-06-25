CLAUDE.md - Application Architecture and Technical Specifications
This document outlines the core architectural principles and technical specifications for the application's frontend, backend, data storage, and file handling, ensuring a modern, efficient, and user-friendly experience.

1. Frontend: Next.js (App Router)
The frontend will be built using Next.js with the App Router, ensuring the implementation of the latest modern frontend development practices.

Modern Implementation: All frontend logic will leverage the most current features and patterns provided by Next.js App Router, including React Server Components, efficient data fetching, and advanced routing capabilities.

Seamless Backend Integration: The frontend will be designed with a strong emphasis on seamless integration with the backend, utilizing Next.js's Server Actions or API Routes to communicate effectively and efficiently with the FastAPI backend.

2. Backend: FastAPI
The backend will be developed using FastAPI, focusing on high performance, modern practices, and robust integration with the frontend.

Modern & High Performance: FastAPI's asynchronous capabilities and Pydantic for data validation will be fully leveraged to build a fast, reliable, and scalable API.

Frontend Integration: The backend API endpoints will be designed to complement frontend requirements, ensuring smooth data exchange, real-time updates where necessary, and optimal response times for a fluid user experience.

3. Event-Driven Architecture with Core Services
The system will adopt an event-driven architecture for scalability, responsiveness, and resilience, utilizing key infrastructure components.

PostgreSQL: Will serve as the primary relational database for storing metadata about videos, users, transcripts, and tasks. It will be activated and configured for optimal performance and data integrity.

Redis: Will be utilized as a high-speed cache for frequently accessed data and for managing real-time states (e.g., upload progress, transcription progress). It will also be used for ephemeral data related to job processing.

RabbitMQ: Will function as the message broker, enabling asynchronous communication between different services. All video processing, transcription, and To-Do list generation tasks will be queued via RabbitMQ, ensuring reliable delivery and decoupled processing.

4. Large File Uploads: MinIO with Multipart Upload
For efficient handling of large video files, MinIO will be used with multipart upload capabilities.

MinIO for Object Storage: MinIO will be used as the S3-compatible object storage solution for storing raw video files and final transcription results (JSON).

Multipart Upload: The implementation will utilize multipart upload to MinIO, allowing large files to be broken down into smaller parts and uploaded in parallel. This significantly improves upload speed and reliability, especially over unreliable networks.

5. Parallel & Asynchronous Video Uploads
The application will support concurrent uploads to enhance user experience.

Asynchronous Uploads: Users will be able to upload multiple video files simultaneously and asynchronously. The frontend will manage these parallel uploads, while the backend and MinIO handle the concurrent data streams.

Real-time Progress: Progress for each parallel upload will be communicated back to the frontend to provide immediate feedback to the user.

6. Real-time Transcription Progress Page
A dedicated "Transcripts" page will provide real-time updates on the processing status of each video.

Comprehensive Status Tracking: For every uploaded video, the "Transcripts" page will display the current status of its entire lifecycle, including:

Multipart Upload Progress: Real-time percentage or status of the video file being uploaded to MinIO.

Video Processing: Status of initial video processing (e.g., format conversion, chunking).

WhisperX Transcription: Progress of the audio transcription using WhisperX.

To-Do List Generation: Status of the AI processing to generate actionable To-Do list items from the transcript.

User Control: This detailed progress view will allow users to monitor and manage multiple video processing tasks effectively.

7. Persistent Transcript Storage
Generated transcripts will be stored persistently until explicitly deleted by the user.

User Control over Deletion: Transcribed content will remain available to the user in the UI until they choose to delete it, ensuring data retention and accessibility.

Multi-layered Deletion: Deletion initiated from the UI will trigger removal of data across all relevant storage layers (MinIO, PostgreSQL).

8. Code Quality and Maintenance
Maintaining a high standard of code quality is paramount.

Clean and Simple: All code will adhere to principles of cleanliness and simplicity, favoring readability and maintainability.

No Unused Code: Regular refactoring and code reviews will ensure that any unused or redundant code is promptly identified and removed.

Recommended Data Storage Strategy:
This strategy is designed to leverage the strengths of each storage system for optimal performance, persistence, and searchability.

MinIO:

Original Files: Store the raw, uploaded video files.

Transcription JSON Results: Store the complete JSON output of the transcription process (e.g., from WhisperX), which includes detailed timestamped text.

Benefit: Provides persistent, fast object storage for large binary files and structured transcription data.

PostgreSQL:

Metadata Only: Store lightweight metadata associated with each video and transcript. This includes:

Video ID, User ID, Filename, Upload Timestamp

Processing Status (e.g., UPLOAD_PENDING, PROCESSING, TRANSCRIBED, FAILED)

Links/References to MinIO objects (e.g., S3 keys for original video and transcript JSON).

Summary of the transcript (e.g., first few lines for quick display).

Generated To-Do list items (as structured data).

Benefit: Enables fast, efficient querying and searching of video and transcript information based on metadata.

Redis:

Cache: Store frequently accessed data for speed optimization (e.g., recently viewed transcript summaries for quick UI loading).

Temporary Progress Data: Manage real-time upload and processing progress states for immediate UI updates.

Ephemeral Job Data: Store transient data related to RabbitMQ message processing before persistent storage in PostgreSQL/MinIO.

Benefit: Enhances application responsiveness by reducing database load and providing fast access to transient and cached information.

Key Benefits of this Strategy:
✅ Fast Multipart Uploads to MinIO, ensuring efficient handling of large video files.

✅ Persistent Storage for both original files and detailed transcription results, ensuring data durability beyond any temporary caches like Redis TTL.

✅ Fast Retrieval of transcription results; accessing JSON files directly from MinIO is often faster for large transcript bodies than complex database queries for the full text.

✅ Proper Deletion implemented across all storage layers, ensuring consistency when a user deletes a transcript.

✅ Searchable Metadata in PostgreSQL, allowing users to quickly find specific videos or transcripts based on various criteria.