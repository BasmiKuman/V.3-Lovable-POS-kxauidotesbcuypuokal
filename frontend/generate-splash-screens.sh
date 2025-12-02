#!/bin/bash

# Script to generate Android splash screens with new logo
# This generates splash screens for all orientations and densities

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🎨 Android Splash Screen Generator for BK POS"
echo "=============================================="

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    sudo apt-get update && sudo apt-get install -y imagemagick
fi

# Source logo
SOURCE_LOGO="public/images/logo.png"

if [ ! -f "$SOURCE_LOGO" ]; then
    echo "❌ Source logo not found at: $SOURCE_LOGO"
    exit 1
fi

echo "📁 Source logo: $SOURCE_LOGO"
echo ""

# Splash screen background color (white)
BG_COLOR="#FFFFFF"

# Create temporary directory
TEMP_DIR="temp_splash"
mkdir -p $TEMP_DIR

echo "🔧 Generating splash screens..."

# Portrait orientations
# LDPI (200x320) - deprecated but kept for compatibility
convert -size 200x320 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 80x80 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_ldpi.png"

# MDPI (320x480)
convert -size 320x480 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 100x100 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_mdpi.png"

# HDPI (480x800)
convert -size 480x800 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 150x150 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_hdpi.png"

# XHDPI (720x1280)
convert -size 720x1280 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 200x200 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_xhdpi.png"

# XXHDPI (1080x1920)
convert -size 1080x1920 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 300x300 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_xxhdpi.png"

# XXXHDPI (1440x2560)
convert -size 1440x2560 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 400x400 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_port_xxxhdpi.png"

echo "✅ Portrait splash screens created"

# Landscape orientations
# LDPI (320x200)
convert -size 320x200 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 80x80 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_ldpi.png"

# MDPI (480x320)
convert -size 480x320 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 100x100 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_mdpi.png"

# HDPI (800x480)
convert -size 800x480 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 150x150 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_hdpi.png"

# XHDPI (1280x720)
convert -size 1280x720 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 200x200 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_xhdpi.png"

# XXHDPI (1920x1080)
convert -size 1920x1080 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 300x300 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_xxhdpi.png"

# XXXHDPI (2560x1440)
convert -size 2560x1440 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 400x400 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_land_xxxhdpi.png"

echo "✅ Landscape splash screens created"

# Default splash (for drawable folder)
convert -size 480x800 xc:"$BG_COLOR" \
    \( "$SOURCE_LOGO" -resize 150x150 \) \
    -gravity center -composite \
    "$TEMP_DIR/splash_default.png"

echo "✅ Default splash screen created"
echo ""

# Copy to Android resource directories
echo "📦 Copying splash screens to Android res directories..."

RES_DIR="android/app/src/main/res"

# Portrait
cp "$TEMP_DIR/splash_port_ldpi.png" "$RES_DIR/drawable-port-ldpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_port_mdpi.png" "$RES_DIR/drawable-port-mdpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_port_hdpi.png" "$RES_DIR/drawable-port-hdpi/splash.png"
cp "$TEMP_DIR/splash_port_xhdpi.png" "$RES_DIR/drawable-port-xhdpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_port_xxhdpi.png" "$RES_DIR/drawable-port-xxhdpi/splash.png"
cp "$TEMP_DIR/splash_port_xxxhdpi.png" "$RES_DIR/drawable-port-xxxhdpi/splash.png"

# Landscape
cp "$TEMP_DIR/splash_land_ldpi.png" "$RES_DIR/drawable-land-ldpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_land_mdpi.png" "$RES_DIR/drawable-land-mdpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_land_hdpi.png" "$RES_DIR/drawable-land-hdpi/splash.png"
cp "$TEMP_DIR/splash_land_xhdpi.png" "$RES_DIR/drawable-land-xhdpi/splash.png"
cp "$TEMP_DIR/splash_land_xxhdpi.png" "$RES_DIR/drawable-land-xxhdpi/splash.png" 2>/dev/null || true
cp "$TEMP_DIR/splash_land_xxxhdpi.png" "$RES_DIR/drawable-land-xxxhdpi/splash.png"

# Default
cp "$TEMP_DIR/splash_default.png" "$RES_DIR/drawable/splash.png"

echo "✅ Splash screens copied to Android directories"

# Cleanup
rm -rf $TEMP_DIR

echo ""
echo "✅ DONE! Android splash screens generated successfully"
echo ""
echo "📋 Splash screens created:"
echo "   - Portrait: ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi"
echo "   - Landscape: ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi"
echo "   - Default: drawable/splash.png"
echo ""
echo "💡 Background color: White (#FFFFFF)"
echo "💡 Logo centered on all screens"
