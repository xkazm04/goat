# Particle Theme Sound Effects

This directory contains sound effect files for particle theme packs.

## Sound File Specifications

- **Format**: MP3 (recommended) or WAV
- **Duration**: 0.2-0.5 seconds
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bit Rate**: 128 kbps minimum for MP3
- **Volume**: Normalized to -6dB to prevent clipping

## Required Sound Files

### Free Themes
Free themes use default browser notification sounds or can have simple sound effects added.

### Neon Collection
- `neon-right.mp3` - Electric zap/synth sound (positive action)
- `neon-left.mp3` - Electric buzz sound (negative action)

### Nature Collection
- `nature-right.mp3` - Gentle chime or bell (positive action)
- `nature-left.mp3` - Soft whoosh or breeze (negative action)

### Fire & Ice Collection
- `fire-right.mp3` - Quick flame whoosh (positive action)
- `fire-left.mp3` - Crackle or sizzle (negative action)
- `ice-right.mp3` - Crystal chime (positive action)
- `ice-left.mp3` - Ice crack sound (negative action)

### Luxury Collection
- `gold-right.mp3` - Coin clink or shimmer (positive action)
- `gold-left.mp3` - Metal clink (negative action)
- `diamond-right.mp3` - High-pitched chime/sparkle (positive action)
- `diamond-left.mp3` - Crystal tap (negative action)

### Retro Wave Collection
- `retro-right.mp3` - 8-bit positive beep (positive action)
- `retro-left.mp3` - 8-bit negative beep (negative action)

## Sound Effect Resources

Free sound effect libraries you can use:
- [Freesound.org](https://freesound.org) - Creative Commons sounds
- [Zapsplat.com](https://www.zapsplat.com) - Free sound effects
- [Mixkit.co](https://mixkit.co/free-sound-effects/) - Royalty-free sounds
- [Pixabay Sounds](https://pixabay.com/sound-effects/) - Free sound effects

## Implementation Notes

1. Sound files should be placed directly in the `/public/sounds/` directory
2. The SwipeableCard component will automatically load and play sounds based on theme configuration
3. Sounds are preloaded on component mount to prevent latency
4. Users can toggle sound effects on/off in the Particle Theme Settings panel
5. If a sound file is missing, the component will gracefully continue without audio

## Creating Your Own Sounds

You can use tools like:
- **Audacity** (free, open-source audio editor)
- **GarageBand** (Mac)
- **FL Studio** (professional)
- **Online generators** like [sfxr](https://sfxr.me/) for 8-bit sounds

### Tips for Good Swipe Sounds
- Keep them short (< 0.5 seconds)
- Make positive sounds higher-pitched or brighter
- Make negative sounds lower-pitched or duller
- Avoid harsh or loud sounds
- Test on mobile devices for volume balance
