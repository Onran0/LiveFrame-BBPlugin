# ![liveframe-plugin](assets/docs/icon.png) LiveFrame Plugin

<sup>[Russian README](README-ru.md)</sup>

This is a plugin for [**Blockbench**](https://www.blockbench.net),
allowing you to export animations to the
[**LiveFrame Animation**](https://github.com/Onran0/LiveFrame/blob/master/docs/ru/public/lfa.md)
format (`.lfa`),
greatly simplifying animating and overall integration
of animations into **[Voxel Core](https://github.com/MihailRis/voxelcore)**.

## How to install?
1) Open the [releases](https://github.com/Onran0/LiveFrame-BBPlugin/releases) page;
2) Download the `liveframe_plugin.zip` file from the latest release;
3) Unzip the archive to any folder;
4) In Blockbench, click `File -> Plugins -> Load plugin from File`
and select `liveframe_plugin.js` in the unzipped folder.

## How to use?

### Export

Simply click `File -> Export animations to LFA` and select the file
to which you want to export the animations.

### Animation events adding

Use **Blockbench Animation Instructions** (`Animate effects -> Instructions -> Add`) for this.
Instead of **MoLang Expression**, type to the `Script` field
event name, or event name and value, separated with `=`.\
Example: `attack`, `attack=123`

## How to build?

### WebStorm Guide

1) Clone the repository through the interface;
2) Open the `LiveFrame-BBPlugin` project;
3) Type `npm run build` in the terminal;
4) Use the plugin build located at `dist/liveframe_plugin/liveframe_plugin.js` relative to the project root.

## License

Project licensed under **Apache 2.0**.