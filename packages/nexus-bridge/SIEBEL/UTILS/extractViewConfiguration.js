'use strict'

void (function() {
  function _typeof(obj) {
    '@babel/helpers - typeof'
    if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
      // eslint-disable-next-line
      _typeof = function _typeof(obj) {
        return typeof obj
      }
    } else {
      // eslint-disable-next-line
      _typeof = function _typeof(obj) {
        return obj &&
          typeof Symbol === 'function' &&
          obj.constructor === Symbol &&
          obj !== Symbol.prototype
          ? 'symbol'
          : typeof obj
      }
    }
    return _typeof(obj)
  }

  function saveJSON(data, filename) {
    if (!data) {
      console.error('saveJSON: No data')
      return
    }

    if (!filename) filename = 'console.json'

    if (_typeof(data) === 'object') {
      data = JSON.stringify(data, undefined, 4)
    }

    const blob = new Blob([data], {
        type: 'text/json'
      }),
      e = document.createEvent('MouseEvents'),
      a = document.createElement('a')
    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
    e.initMouseEvent(
      'click',
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    )
    a.dispatchEvent(e)
  }

  window.getViewConfig = function() {
    if (
      window.SiebelAppFacade.NexusBridge &&
      window.SiebelApp &&
      window.SiebelApp.S_App.GetActiveView()
    ) {
      const activeView = window.SiebelApp.S_App.GetActiveView()
      const appletmap = activeView.GetAppletMap()

      if (appletmap) {
        const output = {}
        output.viewName = activeView.GetName()
        const timestamp = new Date().valueOf()

        for (const applet in appletmap) {
          const appletName = appletmap[applet].GetName()
          const nb = new window.SiebelAppFacade.NexusBridge({
            pm: appletmap[applet].GetPModel(),
            convertDates: true,
            returnRawNumbers: true,
            returnRawCurrencies: true
          })
          const items = nb.getControlsRecordSet()
          const controls = nb.getControls()
          output[appletName] = {
            items: items,
            controls: controls
          }
        }

        window.output = output
        saveJSON(output, 'view-'.concat(timestamp, '.json'))
      } else console.error('appletmap is empty')
    } else
      console.error(
        'make sure you are on siebel view and have nexus-bridge installed before running export (SiebelApp.S_App.GetActiveView() && SiebelAppFacade.NexusBridge should be accessible)'
      )
  }
})()
