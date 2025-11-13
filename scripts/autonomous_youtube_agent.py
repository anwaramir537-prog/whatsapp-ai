import os
import json
import re
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

import requests
from moviepy.editor import VideoFileClip
from PIL import Image, ImageDraw, ImageFont
import pandas as pd
from dataclasses import dataclass
import yt_dlp
import time

# OpenAI v1 client
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('YouTubeAgent')


@dataclass
class VideoMetadata:
    title: str
    description: str
    tags: List[str]
    hashtags: List[str]
    thumbnail_idea: str
    audience: str
    tone: str
    playlists: List[str]
    visibility: str
    category_id: str
    chapters: List[Dict[str, str]]


@dataclass
class PerformanceMetrics:
    views: int
    likes: int
    comments: int
    watch_time: float
    retention: List[float]
    ctr: float


class AutonomousYouTubeAgent:
    def __init__(self, youtube_credentials: Dict, openai_api_key: str, config: Optional[Dict] = None):
        """
        Initialize the Autonomous YouTube Agent

        Args:
            youtube_credentials: YouTube API credentials
            openai_api_key: OpenAI API key
            config: Additional configuration
        """
        self.youtube = self._authenticate_youtube(youtube_credentials)
        self.openai_api_key = openai_api_key
        self.oa = OpenAI(api_key=openai_api_key)

        # Default configuration
        self.config = {
            'max_title_length': 60,
            'max_description_length': 5000,
            'max_tags': 30,
            'thumbnail_size': (1280, 720),
            'default_category': '22',  # People & Blogs
            'auto_schedule': True,
            'publish_time': '17:00',  # 5 PM
            'timezone': 'UTC'
        }
        if config:
            self.config.update(config)

        # Initialize additional services
        self.performance_data = {}
        self.ab_test_results = {}
        logger.info("Autonomous YouTube Agent initialized successfully")

    def _authenticate_youtube(self, credentials: Dict) -> Any:
        """Authenticate with YouTube API"""
        try:
            creds = Credentials.from_authorized_user_info(credentials)
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
            youtube = build('youtube', 'v3', credentials=creds)
            logger.info("YouTube API authentication successful")
            return youtube
        except Exception as e:
            logger.error(f"YouTube authentication failed: {e}")
            raise

    def extract_video_id(self, video_url: str) -> str:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/)([^&/\?]+)',
            r'youtube\.com/embed/([^&/\?]+)',
            r'youtube\.com/v/([^&/\?]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match:
                return match.group(1)
        raise ValueError(f"Could not extract video ID from URL: {video_url}")

    def download_video(self, video_url: str, output_path: str = "temp_video.mp4") -> str:
        """Download video using yt-dlp"""
        try:
            ydl_opts = {
                'outtmpl': output_path,
                'format': 'best[height<=720]',  # Download 720p or lower
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            logger.info(f"Video downloaded successfully: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Video download failed: {e}")
            raise

    def transcribe_video(self, video_url: str) -> str:
        """Transcribe video using OpenAI Whisper (v1 client)"""
        try:
            # Download video
            video_path = self.download_video(video_url)

            # Extract audio
            audio_path = "temp_audio.wav"
            clip = VideoFileClip(video_path)
            clip.audio.write_audiofile(audio_path, logger=None)
            clip.close()  # important for Windows file locks

            # Transcribe with Whisper
            with open(audio_path, "rb") as audio_file:
                tx = self.oa.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )

            # Cleanup temporary files
            try:
                os.remove(audio_path)
            except Exception:
                pass
            try:
                os.remove(video_path)
            except Exception:
                pass

            logger.info("Video transcription completed successfully")
            return tx.text
        except Exception as e:
            logger.error(f"Video transcription failed: {e}")
            raise

    def analyze_content(self, transcript: str) -> Dict[str, Any]:
        """Analyze video content using GPT (v1 client)"""
        try:
            prompt = f"""
Analyze this video transcript and provide comprehensive insights:
TRANSCRIPT: {transcript}
Provide analysis in the following structure:
1. Main topics and key points
2. Target audience description
3. Content tone and style
4. Key moments/timestamps that could be chapters
5. Potential SEO keywords
6. Content quality score (1-10)
7. Suggested improvements
Return as JSON.
"""
            response = self.oa.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            analysis = json.loads(content)
            logger.info("Content analysis completed")
            return analysis
        except Exception as e:
            logger.error(f"Content analysis failed: {e}")
            raise

    def generate_seo_metadata(self, transcript: str, content_analysis: Dict) -> VideoMetadata:
        """Generate SEO-optimized metadata using GPT (v1 client)"""
        try:
            prompt = f"""
You are a professional YouTube SEO specialist. Generate optimized metadata for this video.
CONTENT ANALYSIS: {json.dumps(content_analysis, indent=2)}
TRANSCRIPT (first 2000 chars): {transcript[:2000]}

Generate COMPLETE YouTube metadata including:
TITLE REQUIREMENTS:
- Max 60 characters
- Click-worthy and engaging
- Include primary keyword
- Spark curiosity
DESCRIPTION REQUIREMENTS:
- 3-5 paragraphs
- First paragraph: Hook + key benefits
- Include timestamps/chapters if relevant
- Call-to-action (subscribe, like, comment)
- Relevant links
- 5-10 hashtags
TAGS:
- 15-30 relevant tags
- Mix of broad and specific keywords
ADDITIONAL:
- Thumbnail design idea (specific, actionable)
- Target audience
- Content tone
- Suggested playlists
- YouTube category ID
- Video chapters with timestamps

Return EXACT JSON format:
{{
  "title": "string",
  "description": "string",
  "tags": ["list", "of", "tags"],
  "hashtags": ["list", "of", "hashtags"],
  "thumbnail_idea": "string",
  "audience": "string",
  "tone": "string",
  "playlists": ["list", "of", "playlists"],
  "visibility": "public",
  "category_id": "string",
  "chapters": [{{"timestamp": "00:00", "title": "Introduction"}}]
}}
"""
            response = self.oa.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
            )
            content = response.choices[0].message.content
            metadata_dict = json.loads(content)

            # Optional: enforce configured limits
            if len(metadata_dict.get('title', '')) > self.config['max_title_length']:
                metadata_dict['title'] = metadata_dict['title'][: self.config['max_title_length']].rstrip()
            if isinstance(metadata_dict.get('tags'), list):
                metadata_dict['tags'] = metadata_dict['tags'][: self.config['max_tags']]

            metadata = VideoMetadata(**metadata_dict)
            logger.info("SEO metadata generated successfully")
            return metadata
        except Exception as e:
            logger.error(f"SEO metadata generation failed: {e}")
            raise

    def generate_thumbnail(self, thumbnail_idea: str, output_path: str = "thumbnail.jpg") -> str:
        """Generate thumbnail using DALL·E 3 (v1 images.generate)"""
        try:
            enhanced_prompt = (
                "Create a professional YouTube thumbnail with: "
                "High contrast, vibrant colors, clear focal point, engaging composition, professional typography, YouTube-optimized. "
                f"Concept: {thumbnail_idea}"
            )
            img = self.oa.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            thumbnail_url = img.data[0].url

            r = requests.get(thumbnail_url, timeout=30)
            r.raise_for_status()
            with open(output_path, 'wb') as f:
                f.write(r.content)

            # Resize to YouTube thumbnail dimensions
            im = Image.open(output_path)
            im = im.resize(self.config['thumbnail_size'], Image.Resampling.LANCZOS)
            im.save(output_path, 'JPEG', quality=95)
            logger.info(f"Thumbnail generated successfully: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {e}")
            # Fallback to basic thumbnail
            return self._create_basic_thumbnail(thumbnail_idea, output_path)

    def _create_basic_thumbnail(self, idea: str, output_path: str) -> str:
        """Create a basic thumbnail as fallback"""
        try:
            img = Image.new('RGB', self.config['thumbnail_size'], color='#FF0000')
            d = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("arial.ttf", 40)
            except Exception:
                font = ImageFont.load_default()
            d.text((50, 50), idea[:50], fill=(255, 255, 255), font=font)
            img.save(output_path)
            logger.info(f"Basic thumbnail created: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Basic thumbnail creation also failed: {e}")
            raise

    def ab_test_metadata(self, transcript: str, num_variations: int = 3) -> List[VideoMetadata]:
        """Generate A/B test variations for metadata"""
        variations: List[VideoMetadata] = []
        for i in range(num_variations):
            try:
                prompt = f"""
Create variation #{i+1} for A/B testing. Make it distinct from other variations.
Transcript: {transcript[:1000]}
Create a DIFFERENT approach for:
- Title angle
- Thumbnail concept
- Description focus
Return same JSON format as before.
"""
                response = self.oa.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.9,
                )
                content = response.choices[0].message.content
                variation_dict = json.loads(content)
                variations.append(VideoMetadata(**variation_dict))
            except Exception as e:
                logger.error(f"A/B test variation {i+1} failed: {e}")
        logger.info(f"Generated {len(variations)} A/B test variations")
        return variations

    def analyze_competitors(self, keywords: List[str], max_results: int = 5) -> List[Dict]:
        """Analyze competitor videos for similar content"""
        try:
            competitor_videos: List[Dict] = []
            for keyword in keywords[:3]:  # Limit to top 3 keywords
                request = self.youtube.search().list(
                    part="snippet",
                    q=keyword,
                    type="video",
                    maxResults=max_results,
                    order="viewCount"  # Most popular videos
                )
                response = request.execute()
                for item in response.get('items', []):
                    video_data = {
                        'title': item['snippet']['title'],
                        'description': item['snippet']['description'],
                        'channel_title': item['snippet']['channelTitle'],
                        'published_at': item['snippet']['publishedAt'],
                        'video_id': item['id']['videoId']
                    }
                    competitor_videos.append(video_data)
            logger.info(f"Analyzed {len(competitor_videos)} competitor videos")
            return competitor_videos
        except Exception as e:
            logger.error(f"Competitor analysis failed: {e}")
            return []

    def generate_automated_chapters(self, transcript: str, video_duration: int) -> List[Dict[str, str]]:
        """Generate automated chapters from transcript"""
        try:
            prompt = f"""
Analyze this transcript and create video chapters with timestamps.
Video duration: {video_duration} seconds
Transcript: {transcript}
Create 5-8 logical chapters with:
- Clear timestamps (format: MM:SS)
- Descriptive titles
- Logical progression
Return as JSON list: [{{"timestamp": "00:00", "title": "Chapter 1"}}]
"""
            response = self.oa.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            chapters = json.loads(content)
            logger.info(f"Generated {len(chapters)} automated chapters")
            return chapters
        except Exception as e:
            logger.error(f"Chapter generation failed: {e}")
            return []

    def update_video_metadata(self, video_url: str, metadata: VideoMetadata, thumbnail_path: Optional[str] = None) -> Dict:
        """Update video metadata on YouTube"""
        try:
            video_id = self.extract_video_id(video_url)

            # Prepare description with chapters
            description = metadata.description
            if metadata.chapters:
                description += "\n\nChapters:\n"
                for chapter in metadata.chapters:
                    description += f"{chapter['timestamp']} - {chapter['title']}\n"

            # Update video metadata
            request = self.youtube.videos().update(
                part="snippet,status",
                body={
                    "id": video_id,
                    "snippet": {
                        "title": metadata.title,
                        "description": description,
                        "tags": metadata.tags,
                        "categoryId": metadata.category_id or self.config['default_category'],
                        "defaultLanguage": "en",
                        "defaultAudioLanguage": "en"
                    },
                    "status": {
                        "privacyStatus": metadata.visibility,
                        "selfDeclaredMadeForKids": False
                    }
                }
            )
            response = request.execute()

            # Upload thumbnail if provided
            if thumbnail_path and os.path.exists(thumbnail_path):
                self.upload_thumbnail(video_id, thumbnail_path)

            # Add to playlists if specified
            for playlist in metadata.playlists:
                self.add_to_playlist(video_id, playlist)

            logger.info("Video metadata updated successfully")
            return response
        except Exception as e:
            logger.error(f"Video metadata update failed: {e}")
            raise

    def upload_thumbnail(self, video_id: str, thumbnail_path: str) -> None:
        """Upload custom thumbnail to YouTube"""
        try:
            request = self.youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(thumbnail_path)
            )
            request.execute()
            logger.info("Thumbnail uploaded successfully")
        except Exception as e:
            logger.error(f"Thumbnail upload failed: {e}")

    def add_to_playlist(self, video_id: str, playlist_name: str) -> None:
        """Add video to playlist (create if doesn't exist)"""
        try:
            # First, find or create playlist
            playlists_request = self.youtube.playlists().list(
                part="snippet",
                mine=True,
                maxResults=50
            )
            playlists_response = playlists_request.execute()
            playlist_id = None
            for playlist in playlists_response.get('items', []):
                if playlist['snippet']['title'].lower() == playlist_name.lower():
                    playlist_id = playlist['id']
                    break

            # Create playlist if not found
            if not playlist_id:
                create_request = self.youtube.playlists().insert(
                    part="snippet,status",
                    body={
                        "snippet": {
                            "title": playlist_name,
                            "description": f"Automatically created playlist for {playlist_name}"
                        },
                        "status": {"privacyStatus": "public"}
                    }
                )
                create_response = create_request.execute()
                playlist_id = create_response['id']

            # Add video to playlist
            add_request = self.youtube.playlistItems().insert(
                part="snippet",
                body={
                    "snippet": {
                        "playlistId": playlist_id,
                        "resourceId": {"kind": "youtube#video", "videoId": video_id}
                    }
                }
            )
            add_request.execute()
            logger.info(f"Video added to playlist: {playlist_name}")
        except Exception as e:
            logger.error(f"Failed to add video to playlist {playlist_name}: {e}")

    def schedule_publishing(self, video_url: str, publish_time: datetime) -> None:
        """Schedule video for publishing at specific time"""
        try:
            video_id = self.extract_video_id(video_url)
            publish_time_str = publish_time.isoformat() + 'Z'
            request = self.youtube.videos().update(
                part="status",
                body={
                    "id": video_id,
                    "status": {
                        "privacyStatus": "private",
                        "publishAt": publish_time_str
                    }
                }
            )
            response = request.execute()
            logger.info(f"Video scheduled for publishing at {publish_time}")
            return response
        except Exception as e:
            logger.error(f"Video scheduling failed: {e}")
            raise

    def track_performance(self, video_id: str, days: int = 7) -> PerformanceMetrics:
        """Track video performance metrics"""
        try:
            stats_request = self.youtube.videos().list(
                part="statistics",
                id=video_id
            )
            stats_response = stats_request.execute()
            if not stats_response['items']:
                raise ValueError("Video not found")
            stats = stats_response['items'][0]['statistics']
            metrics = PerformanceMetrics(
                views=int(stats.get('viewCount', 0)),
                likes=int(stats.get('likeCount', 0)),
                comments=int(stats.get('commentCount', 0)),
                watch_time=0.0,  # Would require Analytics API
                retention=[],    # Would require Analytics API
                ctr=0.0         # Would require Analytics API
            )
            logger.info(f"Performance tracking completed for video {video_id}")
            return metrics
        except Exception as e:
            logger.error(f"Performance tracking failed: {e}")
            raise

    def generate_optimization_suggestions(self, metrics: PerformanceMetrics, metadata: VideoMetadata) -> Dict[str, Any]:
        """Generate optimization suggestions based on performance"""
        try:
            prompt = f"""
Analyze these YouTube video metrics and provide optimization suggestions:
CURRENT METRICS:
- Views: {metrics.views}
- Likes: {metrics.likes}
- Comments: {metrics.comments}
- Watch Time: {metrics.watch_time}
- CTR: {metrics.ctr}
CURRENT METADATA:
- Title: {metadata.title}
- Description: {metadata.description[:200]}...
- Tags: {metadata.tags[:5]}...
- Audience: {metadata.audience}
Provide specific, actionable suggestions for:
1. Title optimization
2. Thumbnail improvements
3. Description enhancements
4. Tag refinement
5. Content strategy
6. Audience engagement
Return as JSON.
"""
            response = self.oa.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            suggestions = json.loads(content)
            logger.info("Optimization suggestions generated")
            return suggestions
        except Exception as e:
            logger.error(f"Optimization suggestions generation failed: {e}")
            return {}

    def post_to_other_platforms(self, video_url: str, platforms: List[str], message: str) -> Dict[str, bool]:
        """Cross-post to other platforms (basic implementation)"""
        results: Dict[str, bool] = {}
        for platform in platforms:
            try:
                if platform.lower() == 'twitter':
                    results[platform] = self._post_to_twitter(video_url, message)
                elif platform.lower() == 'linkedin':
                    results[platform] = self._post_to_linkedin(video_url, message)
                elif platform.lower() == 'facebook':
                    results[platform] = self._post_to_facebook(video_url, message)
                else:
                    results[platform] = False
            except Exception as e:
                logger.error(f"Failed to post to {platform}: {e}")
                results[platform] = False
        logger.info(f"Cross-posting results: {results}")
        return results

    def _post_to_twitter(self, video_url: str, message: str) -> bool:
        """Post to Twitter (placeholder implementation)"""
        logger.info(f"Would post to Twitter: {message} - {video_url}")
        return True

    def _post_to_linkedin(self, video_url: str, message: str) -> bool:
        """Post to LinkedIn (placeholder implementation)"""
        logger.info(f"Would post to LinkedIn: {message} - {video_url}")
        return True

    def _post_to_facebook(self, video_url: str, message: str) -> bool:
        """Post to Facebook (placeholder implementation)"""
        logger.info(f"Would post to Facebook: {message} - {video_url}")
        return True

    def auto_respond_to_comments(self, video_id: str, response_template: str) -> None:
        """Auto-respond to comments (basic implementation)"""
        try:
            comments_request = self.youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=20,
                order="time"
            )
            comments_response = comments_request.execute()
            for comment_thread in comments_response.get('items', []):
                comment = comment_thread['snippet']['topLevelComment']['snippet']
                comment_id = comment_thread['snippet']['topLevelComment']['id']
                personalized_response = self._generate_comment_response(
                    comment['textDisplay'], response_template
                )
                if personalized_response:
                    self._post_comment_reply(comment_id, personalized_response)
                time.sleep(2)  # Rate limiting
            logger.info("Auto-responded to comments")
        except Exception as e:
            logger.error(f"Auto-respond failed: {e}")

    def _generate_comment_response(self, comment: str, template: str) -> str:
        """Generate personalized comment response"""
        try:
            prompt = f"""
Generate a friendly, personalized response to this YouTube comment. Use the template as guidance but make it natural and engaging.
COMMENT: {comment}
TEMPLATE: {template}
Keep it under 150 characters. Be authentic and appreciative.
"""
            response = self.oa.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Comment response generation failed: {e}")
            return ""

    def _post_comment_reply(self, parent_comment_id: str, response: str) -> None:
        """Post reply to comment"""
        try:
            request = self.youtube.comments().insert(
                part="snippet",
                body={
                    "snippet": {
                        "parentId": parent_comment_id,
                        "textOriginal": response
                    }
                }
            )
            request.execute()
        except Exception as e:
            logger.error(f"Failed to post comment reply: {e}")

    def generate_analytics_report(self, video_ids: List[str], period_days: int = 30) -> Dict[str, Any]:
        """Generate comprehensive analytics report"""
        try:
            report: Dict[str, Any] = {
                'period_days': period_days,
                'total_videos': len(video_ids),
                'metrics': {},
                'insights': [],
                'recommendations': []
            }
            total_views = 0
            total_likes = 0
            for video_id in video_ids:
                metrics = self.track_performance(video_id)
                report['metrics'][video_id] = metrics
                total_views += metrics.views
                total_likes += metrics.likes

            insights_prompt = f"""
Analyze these YouTube channel metrics and provide insights:
TOTAL VIDEOS: {len(video_ids)}
TOTAL VIEWS: {total_views}
TOTAL LIKES: {total_likes}
AVERAGE VIEWS PER VIDEO: {total_views / len(video_ids) if video_ids else 0}
AVERAGE LIKES PER VIDEO: {total_likes / len(video_ids) if video_ids else 0}
Provide:
1. Key performance insights
2. Content strategy recommendations
3. Audience engagement tips
4. Growth opportunities
Return as JSON.
"""
            insights_response = self.oa.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": insights_prompt}],
                temperature=0.7,
            )
            content = insights_response.choices[0].message.content
            ai_insights = json.loads(content)
            report['insights'] = ai_insights.get('insights', [])
            report['recommendations'] = ai_insights.get('recommendations', [])
            logger.info("Analytics report generated successfully")
            return report
        except Exception as e:
            logger.error(f"Analytics report generation failed: {e}")
            raise

    def run_complete_workflow(self, video_link: str, additional_params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Run the complete autonomous YouTube workflow

        Args:
            video_link: YouTube video URL
            additional_params: Additional parameters for customization
        Returns:
            Dictionary with all results
        """
        logger.info(f"Starting complete workflow for video: {video_link}")
        try:
            # Step 1: Transcribe video
            logger.info("Step 1: Transcribing video...")
            transcript = self.transcribe_video(video_link)

            # Step 2: Analyze content
            logger.info("Step 2: Analyzing content...")
            content_analysis = self.analyze_content(transcript)

            # Step 3: Generate SEO metadata
            logger.info("Step 3: Generating SEO metadata...")
            metadata = self.generate_seo_metadata(transcript, content_analysis)

            # Step 4: Generate thumbnail
            logger.info("Step 4: Generating thumbnail...")
            thumbnail_path = self.generate_thumbnail(metadata.thumbnail_idea)

            # Step 5: A/B test variations (optional)
            ab_variations: List[VideoMetadata] = []
            if additional_params and additional_params.get('generate_ab_tests', False):
                logger.info("Generating A/B test variations...")
                ab_variations = self.ab_test_metadata(transcript)

            # Step 6: Competitor analysis (optional)
            competitor_analysis: List[Dict] = []
            if additional_params and additional_params.get('analyze_competitors', False):
                logger.info("Analyzing competitors...")
                competitor_analysis = self.analyze_competitors(metadata.tags[:5])

            # Step 7: Update video metadata
            logger.info("Step 7: Updating video metadata...")
            update_result = self.update_video_metadata(video_link, metadata, thumbnail_path)

            # Step 8: Schedule publishing (if enabled)
            if self.config['auto_schedule']:
                logger.info("Scheduling video publishing...")
                publish_time = datetime.now() + timedelta(hours=24)  # Schedule for tomorrow
                self.schedule_publishing(video_link, publish_time)

            # Step 9: Cross-platform promotion (optional)
            cross_posting_results: Dict[str, bool] = {}
            if additional_params and additional_params.get('cross_promote', False):
                logger.info("Cross-posting to other platforms...")
                platforms = additional_params.get('platforms', ['twitter'])
                message = f"Check out my new video: {metadata.title}"
                cross_posting_results = self.post_to_other_platforms(
                    video_link, platforms, message
                )

            # Step 10: Generate performance tracking setup
            video_id = self.extract_video_id(video_link)
            performance_metrics = self.track_performance(video_id)
            optimization_suggestions = self.generate_optimization_suggestions(
                performance_metrics, metadata
            )

            # Compile results
            results: Dict[str, Any] = {
                'success': True,
                'video_id': video_id,
                'transcript': transcript,
                'content_analysis': content_analysis,
                'metadata': metadata,
                'thumbnail_path': thumbnail_path,
                'update_result': update_result,
                'performance_metrics': performance_metrics,
                'optimization_suggestions': optimization_suggestions,
                'ab_variations': ab_variations,
                'competitor_analysis': competitor_analysis,
                'cross_posting_results': cross_posting_results,
                'workflow_completed_at': datetime.now().isoformat(),
            }
            logger.info("Complete workflow finished successfully!")
            return results
        except Exception as e:
            logger.error(f"Complete workflow failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'workflow_failed_at': datetime.now().isoformat(),
            }
