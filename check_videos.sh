#!/bin/bash

echo "🎬 NPGX Video Generation Status Check 🎬"
echo "=========================================="

videos=(
  "285343393280170:Luna Cyberblade:Character Intro"
  "285344426803296:Nova Bloodmoon:Character Intro" 
  "285347032977537:Raven Shadowblade:Action Sequence"
  "285344115347553:Phoenix Darkfire:Dramatic Scene"
  "285345413886037:Storm Razorclaw:Dance Performance"
)

for video in "${videos[@]}"; do
  IFS=':' read -r id name type <<< "$video"
  echo "📹 $name ($type)"
  status=$(curl -s "http://localhost:4000/api/generate-video?id=$id" | jq -r '.data.status')
  
  if [ "$status" = "completed" ]; then
    echo "   ✅ READY TO DOWNLOAD!"
    url=$(curl -s "http://localhost:4000/api/generate-video?id=$id" | jq -r '.data.videoUrl')
    echo "   🔗 URL: $url"
  elif [ "$status" = "generating" ]; then
    echo "   ⚡ GENERATING..."
  elif [ "$status" = "queued" ]; then
    echo "   ⏳ QUEUED"
  else
    echo "   ❓ Status: $status"
  fi
  echo ""
done

echo "💰 Budget Status:"
echo "   Spent: $1.45 / $20.00"
echo "   Remaining: $18.55"
echo "   Videos possible: 63 more" 