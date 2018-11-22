// for now only for form and list applets
if (typeof (SiebelAppFacade.N19Helper) === 'undefined') {
  Namespace('SiebelAppFacade.N19Helper');
  SiebelAppFacade.N19Helper = function (settings) { // eslint-disable-line func-names
    const { pm } = settings;
    const appletName = pm.Get('GetName');
    const view = SiebelApp.S_App.GetActiveView();
    const viewName = view.GetName();
    const applet = SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName];
    const isListApplet = typeof applet.GetListOfColumns === 'function';
    const appletId = `s_${pm.Get('GetFullId')}_div`;
    const required = []; // will be empty for list applet
    const lov = {};

    // populate required
    if (!isListApplet) {
      const appletInputs = document.getElementById(appletId).querySelectorAll('input');
      for (let i = 0; i < appletInputs.length; i += 1) {
        if (appletInputs[i].attributes['aria-required']) {
          required.push(appletInputs[i].attributes.name.nodeValue);
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log('N19Helper Started....', appletName, isListApplet, appletId, required);

    // listener to get dynamic LOVs
    pm.AttachNotificationHandler(consts.get('SWE_PROP_BC_NOTI_GENERIC'), (propSet) => {
      const type = propSet.GetProperty(consts.get('SWE_PROP_NOTI_TYPE'));
      if (type === 'GetQuickPickInfo') {
        // console.log(propSet); // eslint-disable-line no-console
        const arr = [];
        CCFMiscUtil_StringToArray(propSet.GetProperty(consts.get('SWE_PROP_ARGS_ARRAY')), arr);
        console.log(arr); // eslint-disable-line no-console
        if (viewName === arr[1] && appletName === arr[2]) {
          lov[arr[3]] = arr.splice(5).filter(el => el !== '');
        }
      }
    });

    // pm.AttachPMBinding('isControlPopupOpen', (...args) => {
    //  console.log('>>>isControlPopupOpen', args); // eslint-disable-line no-console
    // });

    function _getControl(name) {
      return applet.GetControl(name);
    }

    function _returnControls() {
      if (isListApplet) {
        return applet.GetListOfColumns();
      }
      return applet.GetControls();
      // the same - ? // return pm.Get('GetControls');
    }

    function canInvokeMethod(method) {
      return pm.ExecuteMethod('CanInvokeMethod', method);
    }

    function _isSkipControl(type) {
      // https://docs.oracle.com/cd/E74890_01/books/ConfigOpenUI/appendix_a_api002.htm
      // maybe we need to exclude more types
      return (type === consts.get('SWE_PST_BUTTON_CTRL'))
        || (type === consts.get('SWE_CTRL_LINK'))
        || (type === consts.get('SWE_CTRL_PLAINTEXT'))
        || (type === 'null'); // GetUiType returns string
    }

    function _isRequired(inputName) {
      // required is empty for list applets
      return required.indexOf(inputName) > -1;
    }

    function _getStaticLOV(arr) {
      const ret = [];
      for (let i = 0; i < arr.length; i += 1) {
        ret.push(arr[i].propArray);
      }
      return ret;
    }

    function _setActiveControl(name) {
      return applet.SetActiveControl(_getControl(name));
    }

    function _showMvgApplet(name) {
      view.SetActiveAppletInternal(applet);
      _setActiveControl(name);
      const ps = SiebelApp.S_App.NewPropertySet();
      // pm.OnControlEvent( consts.get( "PHYEVENT_INVOKE_MVG" ), control )
      return applet.InvokeMethod('EditPopup', ps, false);
    }

    function getAppletType() {
      return isListApplet ? 'list' : 'form';
    }

    function getControls() {
      console.log('get controls started...'); // eslint-disable-line no-console
      const controls = {};
      const appletControls = _returnControls();
      const arr = Object.keys(appletControls);
      for (let i = 0; i < arr.length; i += 1) {
        const control = appletControls[arr[i]];
        const controlUiType = control.GetUIType();
        if (_isSkipControl(controlUiType)) {
          continue; // eslint-disable-line no-continue
        }
        const controlName = control.GetName();
        const controlInputName = control.GetInputName();
        const obj = {
          name: controlName,
          label: control.GetDisplayName(),
          uiType: controlUiType,
          required: _isRequired(controlInputName),
          boundedPick: control.IsBoundedPick() === '1',
          staticPick: control.IsStaticBounded() === '1',
          pickApplet: control.GetPickApplet(),
          inputName: controlInputName,
          isPostChanges: control.IsPostChanges(),
          maxSize: control.GetMaxSize(),
          maxChars: control.GetMaxChars(),
          fieldName: control.GetFieldName(),
          isLink: pm.ExecuteMethod('CanNavigate', controlName),
        };
        if (isListApplet) {
          // ?
          obj.readOnly = !pm.ExecuteMethod('CanUpdate',
            pm.GetRenderer().GetColumnHelper().GetActualControlName(controlName));
        } else {
          obj.readOnly = !pm.ExecuteMethod('CanUpdate', controlName);
        }
        // add values to be displayed in the static pick list
        if (obj.staticPick) {
          obj.staticLOV = _getStaticLOV(control.GetRadioGroupPropSet().childArray);
        }
        // obj.staticValue = obj.staticLOV; // if somebody already uses it
        controls[controlName] = obj;
      }
      console.log('returns controls -', controls); // eslint-disable-line no-console
      return controls;
    }

    // function _getControlByName(name) {
    // check if controls are not empty
    //  if (Object.keys(controls).length === 0) {
    //    controls = getControls();
    //  }
    //  const control = controls[name];
    //  if (!control) {
    //    throw new Error(`control is not found - ${name}`);
    //  }
    //  return control;
    // }

    function getRecordSet() {
      return pm.Get('GetRecordSet');
    }

    function getRawRecordSet() {
      return pm.Get('GetRawRecordSet');
    }

    function _getRowListRowCount() {
      // how much applet can display (specified in Siebel Tools)
      // 10/20
      return pm.Get('GetRowListRowCount');
    }

    function _getNumRows() {
      // visible in applet
      return pm.Get('GetNumRows');
    }

    function getSelection() {
      return pm.Get('GetSelection');
    }

    function _navigate(method) {
      if (!canInvokeMethod(method)) {
        return false;
      }
      const ps = SiebelApp.S_App.NewPropertySet();
      ps.SetProperty('SWEApplet', appletName);
      ps.SetProperty('SWEView', viewName);
      const ret = applet.InvokeControlMethod(method, ps, {});
      // if (ret) {
      // if navigation was successfull, we need to get the new controls
      // controls = {};
      // }
      return ret;
    }

    function nextRecord() {
      return _navigate(isListApplet ? 'GotoNext' : 'GotoNextSet');
    }

    function nextRecordSet() {
      if (!isListApplet) {
        return false;
      }
      return _navigate('GotoNextSet');
    }

    function positionOnRow(index) {
      if (isListApplet) {
        if (!pm.ExecuteMethod('CanInvokeMethod', 'PositionOnRow')) {
          return false;
        }
        if (_getNumRows() < index + 1) {
          return false;
        }
        return pm.ExecuteMethod('HandleRowSelect', index, false, false);
      }
      return false;
    }

    function prevRecord() {
      if (isListApplet) {
        return positionOnRow(pm.Get('GetSelection') - 1);
      }
      return _navigate(isListApplet ? 'GotoPrevios' : 'GotoPreviousSet');
    }

    function prevRecordSet() {
      if (!isListApplet) {
        return false;
      }
      return _navigate('GotoPreviousSet');
    }

    function _invokeCommandManager(cmd, f) {
      view.SetActiveAppletInternal(applet);
      // maybe we don't need to set active applet if send the command as below
      // "*Browser Applet* *UndoRecord*Service Request Detail Applet* "
      const ai = {
        scope: {
          cb: (...args) => { // eslint-disable-line func-names
            console.log('response in callback', cmd, args); // eslint-disable-line no-console
            if (args[3]) {
              console.log(cmd, 'was successful'); // eslint-disable-line no-console
              if (typeof f === 'function') {
                f(cmd);
              }
            } else {
              console.log(cmd, 'WAS NOT successful'); // eslint-disable-line no-console
            }
          },
        },
      };
      // todo: Do we always need to sent true
      return SiebelApp.CommandManager.GetInstance().InvokeCommand.call(null, cmd, true, ai);
    }

    function newRecord(cb) {
      return _invokeCommandManager('*Browser Applet* *NewRecord* * ', cb);
    }

    function newRecordSync() {
      return pm.ExecuteMethod('InvokeMethod', 'NewRecord', null, false);
    }

    function undoRecord(cb) {
      return _invokeCommandManager('*Browser Applet* *UndoRecord* * ', cb);
    }

    function writeRecord(cb) {
      return _invokeCommandManager('*Browser Applet* *WriteRecord* * ', cb);
    }

    function writeRecordSync() {
      return pm.ExecuteMethod('InvokeMethod', 'WriteRecord', null, false);
    }

    function deleteRecord(cb) {
      console.log(typeof cb); // eslint-disable-line no-console
      return pm.ExecuteMethod('InvokeMethod', 'DeleteRecord', null, false);
      // return _invokeCommandManager('*Browser Applet* *DeleteRecord* * ', cb);
    }

    function _getValueForControl(controlUiType, value) { // from external system
      // DateTime, numbers, and phone
      if (consts.get('SWE_CTRL_CHECKBOX') === controlUiType) {
        // convert true/false => Y/N
        // do we want to support setting to null
        value = value ? 'Y' : 'N'; // eslint-disable-line no-param-reassign
      }
      return value;
    }

    function setControlValue(name, value) {
      // !!! TODO: If value is null, nothing happens, should we convert null to ''?
      const control = _getControl(name);
      // TODO: Check if control is found
      value = _getValueForControl(control.GetUIType(), value); // eslint-disable-line no-param-reassign
      // TODO: should we use SetCellValue for list applets?
      pm.OnControlEvent(consts.get('PHYEVENT_CONTROL_FOCUS'), control);
      const ret = pm.OnControlEvent(consts.get('PHYEVENT_CONTROL_BLUR'), control, value);
      if (!ret) {
        console.log(`Value ${value} was not set for ${control.toString()}`); // eslint-disable-line no-console
        // todo: do we need to put back the old value
      }
      return ret;
    }

    function getDynamicLOV(name) {
      const control = _getControl(name);
      const controlInputName = control.GetInputName();
      lov[controlInputName] = {};
      const ps = SiebelApp.S_App.NewPropertySet();
      ps.SetProperty('SWEField', controlInputName);
      ps.SetProperty('SWEJI', false);
      const ret = applet.InvokeMethod('GetQuickPickInfo', ps);
      // is it possible to get something different than true
      console.log(ret); // eslint-disable-line no-console
      return lov[controlInputName];
    }

    function isInQueryMode() {
      return pm.Get('IsInQueryMode');
    }

    function _NotifyNewDataWS(name) {
      return applet.NotifyNewDataWS(name);
    }

    function getStaticLOV(name) {
      const control = _getControl(name);
      const ret = [];
      if ('1' === control.IsStaticBounded()) {
        const arr = _getStaticLOV(control.GetRadioGroupPropSet().childArray);
        for (let i = 0; i < arr.length; i += 1) {
          ret.push(arr[i].DisplayName);
        }
        ret.sort();
      }
      console.log(ret); // eslint-disable-line no-console
      return ret;
    }

    function _getControlValue(controlUiType, value) { // to be exposed externally
      // todo: datetime
      let ret = value;
      if (consts.get('SWE_CTRL_CHECKBOX') === controlUiType) {
        // convert Y/N/null -> true/false/null
        // do we need to send null?
        switch (value) {
          case 'Y':
            ret = true;
            break;
          case 'N':
            ret = false;
            break;
          default:
            ret = null;
        }
      }
      return ret;
    }

    function getCurrentRecord() {
      // todo: check if record exists
      return pm.Get('GetRecordSet')[pm.Get('GetSelection')];
    }

    function getCurrentRecordModel(_controls) {
      const arr = Object.keys(_controls);
      const index = getSelection();
      const appletControls = _returnControls();
      _controls.isRecord = index > -1; // eslint-disable-line no-param-reassign
      let obj = {};
      if (_controls.isRecord) {
        obj = getRecordSet()[index];
      }

      for (let i = 0; i < arr.length; i += 1) {
        const control = appletControls[arr[i]];
        if (typeof control !== 'undefined') {
          const controlName = control.GetName();
          const controlInputName = control.GetInputName();
          const controlFieldName = control.GetFieldName();
          if (_controls.isRecord) {
            _controls[arr[i]] = { // eslint-disable-line no-param-reassign
              value: _getControlValue(control.GetUIType(), obj[controlFieldName]),
              readonly: !pm.ExecuteMethod('CanUpdate', controlName),
              isLink: pm.ExecuteMethod('CanNavigate', controlName),
              label: control.GetDisplayName(),
              isPostChanges: control.IsPostChanges(),
              required: _isRequired(controlInputName),
              maxSize: control.GetMaxSize(),
            };
          } else { // no record
            _controls[arr[i]] = { // eslint-disable-line no-param-reassign
              value: '', // is it a right value
              readonly: true,
              isLink: false,
              label: control.GetDisplayName(),
              isPostChanges: control.IsPostChanges(),
              required: _isRequired(controlInputName),
              maxSize: control.GetMaxSize(),
            };
          }
        }
      }

      console.log(_controls); // eslint-disable-line no-console
      return true;
    }

    function _getControlInputNameForQuery() {
      const appletControls = _returnControls();
      const arr = Object.keys(appletControls);
      for (let i = 0; i < arr.length; i += 1) {
        const control = appletControls[arr[i]];
        const controlUiType = control.GetUIType();
        if (!_isSkipControl(controlUiType)) {
          return control.GetInputName();
        }
      }
      throw new Error('cannot find a control for query');
    }

    function _newQuery() {
      return pm.ExecuteMethod('InvokeMethod', 'NewQuery', null, false);
    }

    function queryById(rowId, cb) {
      // maybe check if it is already in query mode
      _newQuery(); // ?

      const method = 'ExecuteQuery';
      const ai = {
        scope: this,
        async: true,
        mask: false,
        selfbusy: false,
        args: [],
      };
      if (typeof cb === 'function') {
        ai.cb = cb;
      }

      const psOutput = SiebelApp.S_App.NewPropertySet();
      const psInput = SiebelApp.S_App.NewPropertySet();
      psInput.SetProperty(_getControlInputNameForQuery(), `Id="${rowId}"`);

      ai.args.push(method);
      ai.args.push(psInput.Clone());

      return applet.CallServerApplet(method, psInput, psOutput, ai);
    }

    function query(params, cb) {
      // maybe skip the new query if Object.keys(params).length is 0
      // maybe check if it is already in query mode
      _newQuery();

      const method = 'ExecuteQuery';
      const ai = {
        scope: this,
        async: true,
        mask: false,
        selfbusy: false,
        args: [],
      };
      if (typeof cb === 'function') {
        ai.cb = cb;
      }

      const psOutput = SiebelApp.S_App.NewPropertySet();
      const psInput = SiebelApp.S_App.NewPropertySet();
      const arr = Object.keys(params);
      console.log(arr); // eslint-disable-line no-console
      const _controls = _returnControls();
      for (let i = 0; i < arr.length; i += 1) {
        const control = _controls[arr[i]];
        psInput.SetProperty(control.GetInputName(), _getValueForControl(control.GetUIType(), params[arr[i]]));
      }
      ai.args.push(method);
      ai.args.push(psInput.Clone());

      console.log(psInput); // eslint-disable-line no-console
      return applet.CallServerApplet(method, psInput, psOutput, ai);
    }

    function getFieldToControlsMap(_controls) {
      const ret = {};
      const appletControls = _returnControls();
      const arr = Object.keys(_controls);
      for (let i = 0; i < arr.length; i += 1) {
        const control = appletControls[arr[i]];
        ret[control.GetFieldName()] = {
          name: control.GetName(),
          isPostChanges: control.IsPostChanges(),
          uiType: control.GetUIType(),
        };
      }
      console.log(ret); // eslint-disable-line no-console
      return ret;
    }

    function drilldown(name) {
      // todo: check isLink of control?
      // name is control name, not field
      // index is not effective, and drilldown anyway happens on last selected record

      // check if it ListApplet?
      if (!isListApplet) {
        return false;
      }
      const index = getSelection();
      return pm.ExecuteMethod('OnDrillDown', name, index);
    }

    function gotoView(targetViewName, targetAppletName, id) {
      // todo: get the applet name from the view definition
      const rowId = typeof id === 'undefined' ? getRawRecordSet()[getSelection()].Id : id;
      let SWECmd = `GotoView&SWEView=${targetViewName}&SWEApplet0=${targetAppletName}`;
      SWECmd += `&SWEBU=1&SWEKeepContext=FALSE&SWERowId0=${rowId}`;
      SWECmd = encodeURI(SWECmd);
      SiebelApp.S_App.GotoView(targetViewName, '', SWECmd, '');
    }

    return {
      returnControls: _returnControls,
      getRowListRowCount: _getRowListRowCount,
      getNumRows: _getNumRows,
      // setActiveControl: _setActiveControl,
      showMvgApplet: _showMvgApplet,
      showPickApplet: _showMvgApplet,
      getControlValue: _getControlValue,
      isInQueryMode,
      getAppletType,
      getControls,
      getRecordSet,
      getRawRecordSet,
      getSelection,
      drilldown,
      gotoView,
      nextRecord,
      nextRecordSet,
      prevRecord,
      prevRecordSet,
      positionOnRow,
      newRecord,
      newRecordSync,
      undoRecord,
      writeRecord,
      writeRecordSync,
      deleteRecord,
      setControlValue,
      getDynamicLOV,
      getStaticLOV,
      canInvokeMethod,
      getCurrentRecordModel,
      NotifyNewDataWS: _NotifyNewDataWS,
      getCurrentRecord,
      getFieldToControlsMap,
      queryById,
      query,
      insertPending: () => pm.Get('GetBusComp').insertPending,
      __clearQuery: () => { // todo : could we get it calling the query methods with empty object
        pm.ExecuteMethod('InvokeMethod', 'NewQuery', null, false);
        pm.ExecuteMethod('InvokeMethod', 'ExecuteQuery', null, false);
      },
      __pickRecord: () => pm.ExecuteMethod('InvokeMethod', 'PickRecord'),
      __setPopupVisible: val => SiebelApp.S_App.GetPopupPM().ExecuteMethod('SetPopupVisible', val),
      __deleteRecords: () => pm.ExecuteMethod('InvokeMethod', 'DeleteRecords'),
      refresh: (name) => {
        const service = SiebelApp.S_App.GetService('N19 BS');
        if (service) {
          const inPropSet = SiebelApp.S_App.NewPropertySet();
          inPropSet.SetProperty('name', name);
          service.InvokeMethod('Refresh', inPropSet, {});
        }
      },
      requery: (name) => {
        const service = SiebelApp.S_App.GetService('N19 BS');
        if (service) {
          const inPropSet = SiebelApp.S_App.NewPropertySet();
          inPropSet.SetProperty('name', name);
          service.InvokeMethod('Requery', inPropSet, {});
        }
      }, /* __r1: () => {
      const n = {
          async: true,
          selfbusy: true,
          cb: (...args) => {
            console.log('<<callback returend', args)
          }
        };
        const i = _returnControls()['Sales Rep'];
        const s = i.GetHeight();
        const o = i.GetWidth();
        const r = SiebelApp.S_App.NewPropertySet();
        let u = i.GetInputName();
        r.SetProperty(consts.get("SWE_FIELD_STR"), u);
        r.SetProperty(consts.get("SWE_METHOD_STR"), "EditField");
        r.SetProperty(consts.get("SWE_SHOW_POPUP_STR"), "false");
        r.SetProperty(consts.get("SWE_HEIGHT_STR"), s);
        r.SetProperty(consts.get("SWE_WIDTH_STR"), o);
        r.SetProperty("SWECSP", "false");
        applet.InvokeMethod("EditField", r, n);
      },
      __r2: () => {
        const T = {
          async: true,
          selfbusy: true,
          cb: (...args) => {
            console.log('<<callback returend', args)
          },
          args: [],
          mask: false
        };

        const control = _returnControls()['Sales Rep'];
        const l = SiebelApp.S_App.NewPropertySet();
        l.SetProperty(consts.get("SWE_FIELD_STR"), control.GetInputName());
        l.SetProperty(consts.get("SWE_METHOD_STR"), "EditField");
        l.SetProperty(consts.get("SWE_SHOW_POPUP_STR"), "false");
        l.SetProperty(consts.get("SWE_HEIGHT_STR"), control.GetHeight());
        l.SetProperty(consts.get("SWE_WIDTH_STR"), control.GetWidth());
        l.SetProperty("SWECSP", "false");
        T.args.push('EditField');
        T.args.push(l);
        var k = CCFMiscUtil_CreatePropSet();
        applet.CallServerApplet('EditField', l, k, T);
      },
      __r3: () => {
        // CallServerApplet = function(n, r, i, s)
        // consts.get("SWE_EDIT_FIELD")
        const control = _returnControls()['Sales Rep'];

        const s = {
          async: true,
          selfbusy: true,
          cb: (...args) => {
            console.log('<<callback returend', args)
          },
          args: [],
          mask: false
        };
        const l = SiebelApp.S_App.NewPropertySet();
        l.SetProperty(consts.get("SWE_FIELD_STR"), control.GetInputName());
        l.SetProperty(consts.get("SWE_METHOD_STR"), "EditField");
        l.SetProperty(consts.get("SWE_SHOW_POPUP_STR"), "false");
        l.SetProperty(consts.get("SWE_HEIGHT_STR"), control.GetHeight());
        l.SetProperty(consts.get("SWE_WIDTH_STR"), control.GetWidth());
        l.SetProperty("SWECSP", "false");
        s.args.push('EditField');
        s.args.push(l);

        const u = SiebelApp.S_App.NewPropertySet();
        u.SetProperty(consts.get("SWE_FIELD_STR"), control.GetInputName());
        u.SetProperty(consts.get("SWE_METHOD_STR"), "EditField");
        u.SetProperty(consts.get("SWE_SHOW_POPUP_STR"), "false");
        u.SetProperty(consts.get("SWE_HEIGHT_STR"), control.GetHeight());
        u.SetProperty(consts.get("SWE_WIDTH_STR"), control.GetWidth());
        u.SetProperty("SWECSP", "false");
        u.SetProperty(consts.get("SWE_CMD_ARG"), consts.get("SWE_CMD_INVOKE_METHOD_STR"));
        u.SetProperty(consts.get("SWE_VIEW_ID_ARG"), applet.GetView().GetBusObj().GetZone());
        u.SetProperty(consts.get("SWE_VIEW_ARG"), applet.GetView().GetName());
        u.SetProperty(consts.get("SWE_APPLET_STR"), applet.GetName());
        u.SetProperty(consts.get("SWE_METHOD_STR"), 'EditField');
        var a = applet.GetBusComp().GetIdValue();
        u.SetProperty(consts.get("SWE_ROW_ID_STR"), a);
        u.SetProperty(consts.get("SWE_REQ_ROW_ID_STR"), "1");
        applet.GetRowIds(u);
        u.SetProperty(consts.get("SWE_ACTIVE_APPLET_STR"), applet.GetName());
        u.SetProperty(consts.get("SWE_NEED_CONTEXT_STR"), "true");
        u.SetProperty(consts.get("SWE_COUNT_STR"), SiebelApp.S_App.GetSWEReqCount());
        //SiebelApp.S_App.OfflineCallMethod("SetNewRecord", this, u),
        var i = CCFMiscUtil_CreatePropSet();
        var o = !0;
        SiebelApp.S_App.CallServer(u, i, o, s);

      } */
    };
  };
}
/*
y.prototype.OnDrillDown = function(e, t) {
  var n = CCFMiscUtil_CreatePropSet(),
      s = this.GetListOfColumns(),
      a = this.GetView(),
      f = !0,
      l = !1,
      c;
  a && !a.SetActiveApplet(this) && (a.ProcessError(), f = !1);
  if (f) {
      this.GetBusComp().SetCurRow(this.GetName(), t - 1);
      if (this.PostChangesToBC(!0, null)) {
          for (var h in s)
            s.hasOwnProperty(h) && e === h && (c = s[h]);
          n.SetProperty(r, c.GetSpanPrefix() + t),
          n.SetProperty(consts.get("SWE_ROW_STR"), t), this.GetRowIds(n),
          n.SetProperty(consts.get("SWE_APPLET_STR"), this.GetName()),
          n.SetProperty(consts.get("SWE_ACTIVE_APPLET_STR"), this.GetName()),
          n.SetProperty(consts.get("SWE_BCF_FIELD"), e),
          l = this.InvokeMethod("Drilldown", n, !0)
      }
  }
  return l
} */
