#!/usr/bin/env python3
"""
Comprehensive test script for Facial Expression Analyzer on all videos

This script runs detailed analysis on all videos in the Data_Collection folder,
showing the same level of detail as the single video test for each video.
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
# From Analyzers_tests folder: go up 3 levels to reach project root
project_root = Path(__file__).parent.parent.parent.parent.absolute()
sys.path.append(str(project_root))

# Import only the facial expression analyzer directly
from Performance_Analyzer.analyzers.facial_expression import FacialExpressionAnalyzer


def test_single_video_detailed(analyzer, video_path, video_name):
    """Test a single video with detailed output."""
    print(f"\n{'='*80}")
    print(f"🎬 ANALYZING: {video_name}")
    print(f"{'='*80}")
    
    try:
        print(f"📹 Processing: {video_name}")
        result = analyzer.analyze(video_path)
        
        print(f"✅ Analysis completed!")
        print(f"📊 Score: {result.score:.3f}")
        print(f"📈 Metric: {result.metric}")
        print(f"🤖 Model: {result.model}")
        print(f"⏱️  Duration: {result.duration_ms}ms")
        print(f"🎯 Overall Confidence: {result.confidence:.3f}")
        
        if result.details:
            details = result.details
            
            # Video statistics
            if "total_detections" in details:
                print(f"\n📈 Video Statistics:")
                print(f"   Total faces detected: {details['total_detections']}")
                print(f"   Processed frames: {details.get('processed_frames', 'N/A')}")
                # Remove total_frames and duration since they're not in simplified output
                
            # Emotion distribution
            if "emotion_distribution" in details:
                print(f"\n🎭 Emotion Distribution:")
                emotion_dist = details["emotion_distribution"]
                for emotion, percentage in emotion_dist.items():
                    if percentage > 0:
                        bar_length = int(percentage / 5)  # Scale for display
                        bar = "█" * bar_length + "░" * (20 - bar_length)
                        print(f"   {emotion:<10}: {percentage:5.1f}% {bar}")
            
            # Dominant emotion
            if "dominant_emotion" in details:
                print(f"\n🏆 Dominant Emotion Analysis:")
                print(f"   Primary emotion: {details['dominant_emotion']}")
                print(f"   Dominance: {details.get('dominant_percentage', 0):.1f}%")
        
        return {
            "video": video_name,
            "success": True,
            "score": result.score,
            "confidence": result.confidence,
            "dominant_emotion": details.get("dominant_emotion", "unknown") if details else "unknown",
            "total_detections": details.get("total_detections", 0) if details else 0,
            "duration": result.duration_ms / 1000.0 if result.duration_ms else 0  # Convert ms to seconds
        }
        
    except Exception as e:
        print(f"❌ Error analyzing {video_name}: {e}")
        import traceback
        traceback.print_exc()
        return {
            "video": video_name,
            "success": False,
            "error": str(e)
        }


def test_all_videos_comprehensive():
    """Run comprehensive analysis on all videos."""
    print("🚀 COMPREHENSIVE FACIAL EXPRESSION ANALYSIS")
    print("🎬 Testing all videos with detailed output")
    print("="*80)
    
    # Setup
    data_collection_path = os.path.join(project_root, "Performance_Analyzer", "Data_Collection")
    
    if not os.path.exists(data_collection_path):
        print(f"❌ Data collection folder not found: {data_collection_path}")
        return False
    
    video_files = [f for f in os.listdir(data_collection_path) if f.endswith('.mp4')]
    
    if not video_files:
        print(f"❌ No MP4 files found in: {data_collection_path}")
        return False
    
    print(f"📁 Found {len(video_files)} video files in Data_Collection")
    print(f"📂 Path: {data_collection_path}")
    
    # Initialize analyzer
    config = {
        "frame_stride": 10,  # Process every 10th frame for faster analysis
        "confidence_threshold": 0.3,  # Lower threshold to catch more emotions
        "face_detection_scale": 1.1,
        "min_neighbors": 2
    }
    
    print(f"\n⚙️  Analyzer Configuration:")
    print(f"   Frame stride: {config['frame_stride']}")
    print(f"   Confidence threshold: {config['confidence_threshold']}")
    print(f"   Face detection scale: {config['face_detection_scale']}")
    
    try:
        analyzer = FacialExpressionAnalyzer(config=config)
        print(f"✅ Analyzer initialized successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize analyzer: {e}")
        return False
    
    # Process each video
    results = []
    successful_analyses = 0
    
    for video_file in sorted(video_files):
        video_path = os.path.join(data_collection_path, video_file)
        result = test_single_video_detailed(analyzer, video_path, video_file)
        results.append(result)
        
        if result.get("success", False):
            successful_analyses += 1
    
    # Final summary
    print(f"\n{'='*80}")
    print(f"📊 FINAL ANALYSIS SUMMARY")
    print(f"{'='*80}")
    
    print(f"✅ Successfully analyzed: {successful_analyses}/{len(video_files)} videos")
    
    if successful_analyses > 0:
        print(f"\n📈 Results Overview:")
        print(f"{'Video':<25} | {'Score':<7} | {'Emotion':<12} | {'Detections':<11} | {'Duration':<8}")
        print(f"{'-'*25} | {'-'*7} | {'-'*12} | {'-'*11} | {'-'*8}")
        
        for result in results:
            if result.get("success", False):
                video = result["video"][:23]
                score = f"{result['score']:.3f}"
                emotion = result["dominant_emotion"][:10]
                detections = str(result["total_detections"])
                duration = f"{result['duration']:.1f}s"
                print(f"{video:<25} | {score:<7} | {emotion:<12} | {detections:<11} | {duration:<8}")
        
        # Performance insights
        scores = [r["score"] for r in results if r.get("success", False)]
        if scores:
            avg_score = sum(scores) / len(scores)
            max_score = max(scores)
            min_score = min(scores)
            
            print(f"\n🎯 Performance Insights:")
            print(f"   Average score: {avg_score:.3f}")
            print(f"   Highest score: {max_score:.3f}")
            print(f"   Lowest score: {min_score:.3f}")
            print(f"   Score range: {max_score - min_score:.3f}")
            
            # Best and worst performing videos
            best_video = max(results, key=lambda x: x.get("score", 0) if x.get("success") else 0)
            worst_video = min(results, key=lambda x: x.get("score", 1) if x.get("success") else 1)
            
            print(f"\n🏆 Best Performance: {best_video['video']} (Score: {best_video['score']:.3f})")
            print(f"📉 Needs Improvement: {worst_video['video']} (Score: {worst_video['score']:.3f})")
    
    failed_analyses = len(video_files) - successful_analyses
    if failed_analyses > 0:
        print(f"\n❌ Failed analyses: {failed_analyses}")
        for result in results:
            if not result.get("success", False):
                print(f"   {result['video']}: {result.get('error', 'Unknown error')}")
    
    return successful_analyses == len(video_files)


def main():
    """Main function."""
    success = test_all_videos_comprehensive()
    
    if success:
        print(f"\n🎉 All videos analyzed successfully!")
        return 0
    else:
        print(f"\n⚠️  Some videos failed analysis. Check errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())