
## About
Script to export data and controls configuration to file on all applets in the Siebel view using browser console.

## Setup
1. [Setup NexusBridge](https://github.com/ideaportriga/nexus-bridge/wiki/Setup-Nexus-Bridge).
	> NexusBridge class should be available under `SiebelAppFacade.NexusBridge` in browser console.
3.  Download `extractViewConfiguration.js` and copy to your custom scripts folder e.g.  `C:\Siebel\[version]\Client\public\SCRIPTS\siebel\custom\`.

4.  Use Siebel Client to add the reference to  `extractViewConfiguration.js`  in Siebel Open UI Manifest:

    -   under  `Administration - Application > Manifest Files`  add a new record with  **Name:**  `siebel/custom/extractViewConfiguration.js`

    -   under  `Administration - Application > Manifest Administration`  add a new record under  **UI Objects**:

        -   **Name:**  `PLATFORM INDEPENDENT`

        -   **Usage Type:**  `Common`

        -   **Type:**  `Application`

        -   **Note**: there might be already  `PLATFORM INDEPENDENT`  record with custom files defined. In this case you need to use it.

    -   add a new record under  **Object Expression**  with:  **Level:**  `1`

    -   add a new record under  **Files**  with:  **Name:**  `siebel/custom/extractViewConfiguration.js`

    -   Restart Siebel Client application

## Usage
Enter the Siebel view, open browser console, run `getViewConfig()` function.
File with view configuration should start downloading.
