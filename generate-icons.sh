#!/bin/bash

# 🎨 Generate Android Icon & Splash Screen from BK Logo
# This script creates all required icon sizes and splash screens

echo "🎨 Generating Android Icons & Splash Screens..."
echo ""

# Source logo
LOGO_SOURCE="public/images/3f39c041-7a69-4897-8bed-362f05bda187.png"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not installed!"
    echo "📦 Installing ImageMagick..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    else
        echo "❌ Please install ImageMagick manually:"
        echo "   Linux: sudo apt-get install imagemagick"
        echo "   macOS: brew install imagemagick"
        echo "   Windows: https://imagemagick.org/script/download.php"
        exit 1
    fi
fi

echo "✅ ImageMagick ready!"
echo ""

# Create temp directory for processing
TEMP_DIR="temp_icons"
mkdir -p $TEMP_DIR

# ========================================
# STEP 1: Generate App Icons (launcher)
# ========================================

echo "📱 Generating App Icons..."

# App icon sizes (square with padding)
declare -A ICON_SIZES=(
    ["mdpi"]="48"
    ["hdpi"]="72"
    ["xhdpi"]="96"
    ["xxhdpi"]="144"
    ["xxxhdpi"]="192"
)

# Foreground icon sizes (for adaptive icons)
declare -A FOREGROUND_SIZES=(
    ["mdpi"]="108"
    ["hdpi"]="162"
    ["xhdpi"]="216"
    ["xxhdpi"]="324"
    ["xxxhdpi"]="432"
)

# Generate launcher icons with white background
for density in "${!ICON_SIZES[@]}"; do
    size="${ICON_SIZES[$density]}"
    output_dir="android/app/src/main/res/mipmap-$density"
    
    echo "  ✓ Generating $density ($size x $size px)"
    
    # Round icon with white background
    convert "$LOGO_SOURCE" \
        -resize "${size}x${size}" \
        -gravity center \
        -background white \
        -extent "${size}x${size}" \
        "$output_dir/ic_launcher.png"
    
    # Round variant
    convert "$LOGO_SOURCE" \
        -resize "${size}x${size}" \
        -gravity center \
        -background white \
        -extent "${size}x${size}" \
        \( +clone -threshold -1 -negate -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) \
        -alpha off -compose copy_opacity -composite \
        "$output_dir/ic_launcher_round.png"
done

echo "✅ App icons generated!"
echo ""

# ========================================
# STEP 2: Generate Foreground Icons
# ========================================

echo "🎨 Generating Foreground Icons (Adaptive)..."

for density in "${!FOREGROUND_SIZES[@]}"; do
    size="${FOREGROUND_SIZES[$density]}"
    output_dir="android/app/src/main/res/mipmap-$density"
    
    echo "  ✓ Generating $density foreground ($size x $size px)"
    
    # Foreground with transparent background (for adaptive icon)
    convert "$LOGO_SOURCE" \
        -resize "${size}x${size}" \
        -gravity center \
        -background none \
        -extent "${size}x${size}" \
        "$output_dir/ic_launcher_foreground.png"
done

echo "✅ Foreground icons generated!"
echo ""

# ========================================
# STEP 3: Generate Splash Screens
# ========================================

echo "💦 Generating Splash Screens..."

# Splash screen sizes (portrait)
declare -A SPLASH_PORT=(
    ["mdpi"]="320x470"
    ["hdpi"]="480x640"
    ["xhdpi"]="720x960"
    ["xxhdpi"]="1080x1440"
    ["xxxhdpi"]="1440x1920"
)

# Splash screen sizes (landscape)
declare -A SPLASH_LAND=(
    ["mdpi"]="470x320"
    ["hdpi"]="640x480"
    ["xhdpi"]="960x720"
    ["xxhdpi"]="1440x1080"
    ["xxxhdpi"]="1920x1440"
)

# Logo size on splash (30% of screen height)
declare -A LOGO_SIZE=(
    ["mdpi"]="140"
    ["hdpi"]="192"
    ["xhdpi"]="288"
    ["xxhdpi"]="432"
    ["xxxhdpi"]="576"
)

# Generate portrait splash screens
echo "  📱 Portrait orientation..."
for density in "${!SPLASH_PORT[@]}"; do
    size="${SPLASH_PORT[$density]}"
    logo_size="${LOGO_SIZE[$density]}"
    
    echo "    ✓ $density ($size)"
    
    convert -size $size xc:"#ffffff" \
        \( "$LOGO_SOURCE" -resize "${logo_size}x${logo_size}" \) \
        -gravity center -composite \
        "android/app/src/main/res/drawable-port-$density/splash.png"
done

# Generate landscape splash screens
echo "  🖥️  Landscape orientation..."
for density in "${!SPLASH_LAND[@]}"; do
    size="${SPLASH_LAND[$density]}"
    logo_size="${LOGO_SIZE[$density]}"
    
    echo "    ✓ $density ($size)"
    
    convert -size $size xc:"#ffffff" \
        \( "$LOGO_SOURCE" -resize "${logo_size}x${logo_size}" \) \
        -gravity center -composite \
        "android/app/src/main/res/drawable-land-$density/splash.png"
done

# Generate default splash (used by Capacitor)
echo "  🎯 Default splash screen..."
convert -size 2732x2732 xc:"#ffffff" \
    \( "$LOGO_SOURCE" -resize 800x800 \) \
    -gravity center -composite \
    "android/app/src/main/res/drawable/splash.png"

echo "✅ Splash screens generated!"
echo ""

# ========================================
# STEP 4: Update colors.xml for background
# ========================================

echo "🎨 Updating background colors..."

cat > android/app/src/main/res/values/ic_launcher_background.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- BK POS Brand Color - White background for icons -->
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
EOF

echo "✅ Background color updated!"
echo ""

# Clean up
rm -rf $TEMP_DIR

echo "🎉 Done!"
echo ""
echo "📦 Generated files:"
echo "  - App icons: android/app/src/main/res/mipmap-*/"
echo "  - Splash screens: android/app/src/main/res/drawable-*/"
echo ""
echo "🚀 Next steps:"
echo "  1. Run: npm run build"
echo "  2. Run: npx cap sync android"
echo "  3. Build APK with new icons!"
echo ""
