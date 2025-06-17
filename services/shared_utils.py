# Shared utilities for all microservices
import os
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

import pika
import redis
from minio import Minio
from minio.error import S3Error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageBroker:
    """RabbitMQ message broker wrapper"""
    
    def __init__(self, rabbitmq_url: str):
        self.rabbitmq_url = rabbitmq_url
        self.connection = None
        self.channel = None
        self.connect()
        
    def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            parameters = pika.URLParameters(self.rabbitmq_url)
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise
            
    def declare_queue(self, queue_name: str, durable: bool = True):
        """Declare a queue"""
        self.channel.queue_declare(queue=queue_name, durable=durable)
        
    def declare_exchange(self, exchange_name: str, exchange_type: str = 'topic'):
        """Declare an exchange"""
        self.channel.exchange_declare(exchange=exchange_name, exchange_type=exchange_type)
        
    def publish_message(self, exchange: str, routing_key: str, message: Dict[Any, Any]):
        """Publish a message to an exchange"""
        try:
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    timestamp=int(datetime.now().timestamp())
                )
            )
            logger.info(f"Published message to {exchange}/{routing_key}")
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
            raise
            
    def consume_messages(self, queue_name: str, callback):
        """Consume messages from a queue"""
        self.channel.basic_consume(
            queue=queue_name,
            on_message_callback=callback,
            auto_ack=False
        )
        logger.info(f"Starting to consume messages from {queue_name}")
        self.channel.start_consuming()
        
    def close(self):
        """Close connection"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()

class StorageManager:
    """MinIO storage manager"""
    
    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket_name: str):
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False  # Set to True for HTTPS
        )
        self.bucket_name = bucket_name
        self._ensure_bucket_exists()
        
    def _ensure_bucket_exists(self):
        """Ensure the bucket exists"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Error creating bucket: {e}")
            raise
            
    def upload_file(self, file_path: str, object_name: str, content_type: str = None) -> str:
        """Upload a file to MinIO"""
        try:
            self.client.fput_object(
                self.bucket_name,
                object_name,
                file_path,
                content_type=content_type
            )
            logger.info(f"Uploaded {file_path} as {object_name}")
            return object_name
        except S3Error as e:
            logger.error(f"Error uploading file: {e}")
            raise
            
    def download_file(self, object_name: str, file_path: str):
        """Download a file from MinIO"""
        try:
            self.client.fget_object(self.bucket_name, object_name, file_path)
            logger.info(f"Downloaded {object_name} to {file_path}")
        except S3Error as e:
            logger.error(f"Error downloading file: {e}")
            raise
            
    def get_presigned_url(self, object_name: str, expires_in_seconds: int = 3600) -> str:
        """Get a presigned URL for file access"""
        try:
            from datetime import timedelta
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expires_in_seconds)
            )
            return url
        except S3Error as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
            
    def delete_file(self, object_name: str):
        """Delete a file from MinIO"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Deleted {object_name}")
        except S3Error as e:
            logger.error(f"Error deleting file: {e}")
            raise

class CacheManager:
    """Redis cache manager"""
    
    def __init__(self, redis_url: str):
        self.client = redis.from_url(redis_url)
        
    def set(self, key: str, value: Any, expire: int = None):
        """Set a value in cache"""
        try:
            serialized_value = json.dumps(value) if not isinstance(value, str) else value
            self.client.set(key, serialized_value, ex=expire)
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            raise
            
    def get(self, key: str) -> Any:
        """Get a value from cache"""
        try:
            value = self.client.get(key)
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value.decode('utf-8')
            return None
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            raise
            
    def delete(self, key: str):
        """Delete a key from cache"""
        try:
            self.client.delete(key)
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            raise
            
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        return self.client.exists(key) > 0

# Event types for the messaging system
class EventTypes:
    FILE_UPLOADED = "file.uploaded"
    FILE_PROCESSING_STARTED = "file.processing.started"
    VIDEO_PROCESSED = "video.processed"
    TRANSCRIPTION_STARTED = "transcription.started"
    TRANSCRIPTION_COMPLETED = "transcription.completed"
    ANALYSIS_STARTED = "analysis.started"
    ANALYSIS_COMPLETED = "analysis.completed"
    PROCESSING_FAILED = "processing.failed"
    PROCESSING_COMPLETED = "processing.completed"

# Queue names
class Queues:
    FILE_UPLOAD = "file_upload_queue"
    VIDEO_PROCESSING = "video_processing_queue"
    TRANSCRIPTION = "transcription_queue"
    ANALYSIS = "analysis_queue"
    NOTIFICATIONS = "notifications_queue"

# Exchange names
class Exchanges:
    WHISPERNOTES = "whispernotes_exchange"