#!/bin/bash

# Script to generate Android app icons with proper safe zones
# This generates adaptive icons that won't be cropped on any device

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🎨 Android Icon Generator for BK POS"
echo "===================================="

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    sudo apt-get update && sudo apt-get install -y imagemagick
fi

# Source icon (you should replace this with your actual logo)
SOURCE_ICON="public/images/logo.png"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found at: $SOURCE_ICON"
    echo "Please provide your logo file path"
    exit 1
fi

echo "📁 Source icon: $SOURCE_ICON"

# Create temporary directory
TEMP_DIR="temp_icons"
mkdir -p $TEMP_DIR

echo ""
echo "🔧 Preparing icon with safe zone (66% of original, centered)..."

# For adaptive icons, we need to create a 108x108dp icon
# with the actual content in the center 72x72dp area (66.67%)
# This means 18dp padding on all sides

# Step 1: Create foreground icons (with safe zone)
# The content should be scaled to ~66% and centered

# MDPI (baseline 48x48, adaptive 108x108)
convert "$SOURCE_ICON" -resize 72x72 -gravity center -background none -extent 108x108 "$TEMP_DIR/ic_launcher_foreground_mdpi.png"

# HDPI (1.5x)
convert "$SOURCE_ICON" -resize 108x108 -gravity center -background none -extent 162x162 "$TEMP_DIR/ic_launcher_foreground_hdpi.png"

# XHDPI (2x)
convert "$SOURCE_ICON" -resize 144x144 -gravity center -background none -extent 216x216 "$TEMP_DIR/ic_launcher_foreground_xhdpi.png"

# XXHDPI (3x)
convert "$SOURCE_ICON" -resize 216x216 -gravity center -background none -extent 324x324 "$TEMP_DIR/ic_launcher_foreground_xxhdpi.png"

# XXXHDPI (4x)
convert "$SOURCE_ICON" -resize 288x288 -gravity center -background none -extent 432x432 "$TEMP_DIR/ic_launcher_foreground_xxxhdpi.png"

echo "✅ Foreground icons created with safe zones"

# Step 2: Create legacy icons (non-adaptive, for older Android versions)
# These should be opaque with background

echo ""
echo "🔧 Creating legacy icons (with background)..."

# MDPI
convert "$SOURCE_ICON" -resize 40x40 -gravity center -background white -extent 48x48 "$TEMP_DIR/ic_launcher_mdpi.png"
convert "$TEMP_DIR/ic_launcher_mdpi.png" -alpha on \( +clone -background white -shadow 80x3+0+0 \) +swap -background none -layers merge +repage "$TEMP_DIR/ic_launcher_mdpi.png"

# HDPI
convert "$SOURCE_ICON" -resize 60x60 -gravity center -background white -extent 72x72 "$TEMP_DIR/ic_launcher_hdpi.png"

# XHDPI
convert "$SOURCE_ICON" -resize 80x80 -gravity center -background white -extent 96x96 "$TEMP_DIR/ic_launcher_xhdpi.png"

# XXHDPI
convert "$SOURCE_ICON" -resize 120x120 -gravity center -background white -extent 144x144 "$TEMP_DIR/ic_launcher_xxhdpi.png"

# XXXHDPI
convert "$SOURCE_ICON" -resize 160x160 -gravity center -background white -extent 192x192 "$TEMP_DIR/ic_launcher_xxxhdpi.png"

echo "✅ Legacy icons created"

# Step 3: Create round icons (same as legacy but circular)
echo ""
echo "🔧 Creating round icons..."

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    convert "$TEMP_DIR/ic_launcher_${density}.png" \
        \( +clone -alpha extract -draw 'fill black polygon 0,0 0,100% 100%,100% 100%,0' -blur 0x5 -level 50%,100% +level-colors white \) \
        -alpha off -compose copy_opacity -composite \
        "$TEMP_DIR/ic_launcher_round_${density}.png"
done

echo "✅ Round icons created"

# Step 4: Copy to Android resource directories
echo ""
echo "📦 Copying icons to Android res directories..."

RES_DIR="android/app/src/main/res"

# Copy foreground icons
cp "$TEMP_DIR/ic_launcher_foreground_mdpi.png" "$RES_DIR/mipmap-mdpi/ic_launcher_foreground.png"
cp "$TEMP_DIR/ic_launcher_foreground_hdpi.png" "$RES_DIR/mipmap-hdpi/ic_launcher_foreground.png"
cp "$TEMP_DIR/ic_launcher_foreground_xhdpi.png" "$RES_DIR/mipmap-xhdpi/ic_launcher_foreground.png"
cp "$TEMP_DIR/ic_launcher_foreground_xxhdpi.png" "$RES_DIR/mipmap-xxhdpi/ic_launcher_foreground.png"
cp "$TEMP_DIR/ic_launcher_foreground_xxxhdpi.png" "$RES_DIR/mipmap-xxxhdpi/ic_launcher_foreground.png"

# Copy legacy icons
cp "$TEMP_DIR/ic_launcher_mdpi.png" "$RES_DIR/mipmap-mdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher_hdpi.png" "$RES_DIR/mipmap-hdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher_xhdpi.png" "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher_xxhdpi.png" "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
cp "$TEMP_DIR/ic_launcher_xxxhdpi.png" "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"

# Copy round icons
cp "$TEMP_DIR/ic_launcher_round_mdpi.png" "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"
cp "$TEMP_DIR/ic_launcher_round_hdpi.png" "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"
cp "$TEMP_DIR/ic_launcher_round_xhdpi.png" "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"
cp "$TEMP_DIR/ic_launcher_round_xxhdpi.png" "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"
cp "$TEMP_DIR/ic_launcher_round_xxxhdpi.png" "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

echo "✅ Icons copied to Android directories"

# Cleanup
rm -rf $TEMP_DIR

echo ""
echo "✅ DONE! Android icons generated successfully"
echo ""
echo "📋 Next steps:"
echo "1. Build APK: npm run build"
echo "2. Or push to GitHub to trigger auto-build"
echo ""
echo "💡 Tips for best results:"
echo "   - Use a square logo (1:1 aspect ratio)"
echo "   - Logo should have transparent background"
echo "   - Minimum 512x512px recommended"
echo "   - Avoid text near edges (will be cropped on some devices)"
