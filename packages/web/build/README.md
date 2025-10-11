# Application Icons

This directory contains the application icons for different platforms.

## Required Icon Files

Place the following files in this directory before packaging:

### Windows
- **File**: `icon.ico`
- **Format**: Multi-resolution ICO file
- **Sizes**: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 (all embedded in one file)

### macOS
- **File**: `icon.icns`
- **Format**: Apple Icon Image format
- **Sizes**: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- **Note**: Should include @2x Retina versions

### Linux
- **File**: `icon.png`
- **Format**: PNG image
- **Size**: 512x512 or 1024x1024 (square)

## How to Generate Icons

### Option 1: Using electron-icon-builder (Recommended)

```bash
# Install the package
npm install --save-dev electron-icon-builder

# Generate all platform icons from a single source PNG (1024x1024)
npx electron-icon-builder --input=./source-icon.png --output=./packages/web/build
```

### Option 2: Using Online Tools

Visit [iConvert Icons](https://iconverticons.com/online/) and:
1. Upload your high-resolution PNG (minimum 1024x1024)
2. Select all platforms (Windows ICO, macOS ICNS, Linux PNG)
3. Download the generated files
4. Place them in this directory

### Option 3: Using ImageMagick (Manual)

**Windows ICO:**
```bash
magick convert source.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**macOS ICNS:**
```bash
# Requires macOS iconutil
mkdir icon.iconset
# Generate all required sizes...
iconutil -c icns icon.iconset -o icon.icns
```

**Linux PNG:**
```bash
magick convert source.png -resize 512x512 icon.png
```

## Design Guidelines

### General Requirements
- **Source image**: Start with at least 1024x1024 PNG
- **Aspect ratio**: Square (1:1)
- **Background**: Transparent (for better integration)
- **Format**: 32-bit PNG with alpha channel
- **Safe area**: Keep important content within central 80% (margins for smaller sizes)

### Visual Guidelines
- **Simple design**: Avoid fine details that disappear at small sizes
- **High contrast**: Ensure visibility on light and dark backgrounds
- **Clear shapes**: Bold, recognizable silhouette
- **Test at small sizes**: Preview at 16x16 and 32x32 to ensure readability

### Brand Guidelines (Yasban)
- **Colors**: Blue (#3b82f6) and Gold (#f59e0b)
- **Elements**:
  - Arabic calligraphy: يسبان (top-left corner, small)
  - Stylized icon: Gear + lightning bolt (combined)
  - Blue gradient background
  - Gold accent borders

## Placeholder Icons

Until custom icons are created, electron-builder will use default Electron icons.

To use default icons temporarily:
1. Remove or don't create the icon files
2. electron-builder will automatically use fallback icons
3. Add custom icons before final release

## Testing Icons

After generating icons, test them by:

1. **Build the app**:
   ```bash
   npm run package:win    # or package:mac, package:linux
   ```

2. **Check the installer**:
   - Windows: Check the .exe icon in File Explorer
   - macOS: Check the .app icon in Finder
   - Linux: Check the .AppImage or .deb icon

3. **Verify sizes**:
   - View icons at different sizes (small, medium, large)
   - Check taskbar/dock icons
   - Check alt-tab switcher icons

## File Size Guidelines

- **ICO**: Should be under 1MB (typically 100-300KB)
- **ICNS**: Should be under 2MB (typically 200-500KB)
- **PNG**: Should be under 500KB (typically 50-200KB)

If files are too large:
- Use PNG compression tools (TinyPNG, ImageOptim)
- Reduce color depth if possible
- Remove unnecessary metadata

## Platform-Specific Notes

### Windows
- ICO files support multiple resolutions in one file
- Windows will automatically select the best size for each context
- Test on Windows 10 and 11 for modern icon rendering

### macOS
- ICNS files are required for proper Retina display support
- macOS Finder shows icons at various sizes (16x16 to 512x512)
- Test on both Retina and non-Retina displays

### Linux
- Different distributions may handle icons differently
- Test on Ubuntu, Fedora, and other popular distros
- AppImage and DEB packages embed icons differently

## Resources

- [Electron Builder Icon Guide](https://www.electron.build/icons)
- [Apple Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Windows Icon Guidelines](https://learn.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-design)
- [Icon Design Principles](https://material.io/design/iconography/product-icons.html)

## Status

**Current Status**: Icons not yet created (using default Electron icons)

**TODO**:
- [ ] Design high-resolution source icon (1024x1024)
- [ ] Generate Windows ICO file
- [ ] Generate macOS ICNS file
- [ [ Generate Linux PNG file
- [ ] Test icons on all platforms
- [ ] Commit final icons to repository

---

**Last Updated**: 2025-01-11
**Maintained By**: Yasban Development Team
