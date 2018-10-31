if (typeof (SiebelAppFacade.DefaultFormAppletPR) === "undefined") {

  SiebelJS.Namespace("SiebelAppFacade.DefaultFormAppletPR");
  define("siebel/custom/DefaultFormAppletPR", ["siebel/phyrenderer", "siebel/custom/vue.js", "siebel/custom/vuetify.js"],
    function () {
      SiebelAppFacade.DefaultFormAppletPR = (function () {

        function DefaultFormAppletPR(pm) {
          SiebelAppFacade.DefaultFormAppletPR.superclass.constructor.apply(this, arguments);
        }

        SiebelJS.Extend(DefaultFormAppletPR, SiebelAppFacade.PhysicalRenderer);
        var pm;
        var appletName;
        var viewName;
        var app;
        var controlInfo;
        var controlName;
        var controlCategory;
        var controlStatus;

        DefaultFormAppletPR.prototype.Init = function () {
          SiebelAppFacade.DefaultFormAppletPR.superclass.Init.apply(this, arguments);
          pm = this.GetPM();
          appletName = pm.Get("GetName");
          viewName = SiebelApp.S_App.GetActiveView().GetName();

          this.GetPM().AttachNotificationHandler(consts.get("SWE_PROP_BC_NOTI_GENERIC"), function (propSet){
            var type = propSet.GetProperty(consts.get("SWE_PROP_NOTI_TYPE"));
            if (type === "GetQuickPickInfo"){
              var arr = [];
              CCFMiscUtil_StringToArray (propSet.GetProperty(consts.get("SWE_PROP_ARGS_ARRAY")), arr);
              console.log(arr);
              controlStatus = pm.ExecuteMethod("GetControl", 'Status');
              if (viewName == arr[1] && appletName == arr[2] && controlStatus.GetInputName() == arr[3]) {
                console.log('calling populateStatusArray...');
                app.populateStatusArray(arr.splice(5))
              }
            }
          });


          this.GetPM().AttachNotificationHandler(consts.get("SWE_PROP_BC_NOTI_NEW_ACTIVE_ROW"), function () {
            afterSelection();
          });
        }

        DefaultFormAppletPR.prototype.ShowUI = function () {
          //SiebelAppFacade.DefaultFormAppletPR.superclass.ShowUI.apply(this, arguments);
        }

        DefaultFormAppletPR.prototype.BindEvents = function () {
          //SiebelAppFacade.DefaultFormAppletPR.superclass.BindEvents.apply(this, arguments);
        }

        DefaultFormAppletPR.prototype.BindData = function (bRefresh) {
          //SiebelAppFacade.DefaultFormAppletPR.superclass.BindData.apply(this, arguments);
//return;

          var divId = "s_" + this.GetPM().Get("GetFullId") + "_div";
          controlInfo = pm.ExecuteMethod("GetControl", 'InfoChanged');
          controlName = pm.ExecuteMethod("GetControl", 'Name');

          var input = SiebelAppFacade.HTMLTemplateManager.GenerateMarkup({
            type: consts.get('SWE_CTRL_TEXT'),
            id: 'ipr-input-text',
            className: 'siebui-align-left siebui-input-align-left',
            attrs: 'title="Enter the case name" aria-label="Case Name" placeholder="<Enter case name>"'
          });

          var checkBox = SiebelAppFacade.HTMLTemplateManager.GenerateMarkup({
            type: consts.get('SWE_CTRL_CHECKBOX'),
            id: 'ipr-input-check'
          });

          var button = SiebelAppFacade.HTMLTemplateManager.GenerateMarkup({
            type: consts.get('SWE_PST_BUTTON_CTRL'),
            value: '<span>Save</span>',
            className: 'appletButton',
            attrs: 'title="Click on me to save the case" aria-label="Save"'
          });

          var nextRecordButton = SiebelAppFacade.HTMLTemplateManager.GenerateMarkup({
            type: consts.get('SWE_PST_BUTTON_CTRL'),
            id: 'ipr-next-record',
            value: '<span>Next</span>',
            className: 'appletButton',
            attrs: 'title="Click on me to go to the next record" aria-label="Next"'
          });

          $('#' + divId).find('form').hide().end()
            .append('<div>' + input + checkBox + '</div>' + button)
            .find('button').on('click', function (e) {
              //Save the record
              SiebelApp.S_App.GetActiveView().SetActiveAppletInternal(SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName]);
              var ai = {
                scope: {
                  cb: function () {
                    console.log('response in callback from save record >>>', arguments);
                    if (arguments[3]) {
                      console.log('save was successful');
                    } else {
                      console.log('save WAS NOT successful');
                    }
                  }
                }
              }
              SiebelApp.CommandManager.GetInstance().InvokeCommand.call(SiebelApp.CommandManager.GetInstance, "*Browser Applet* *WriteRecord* * ", true, ai);
            })
            .end()
            .append(nextRecordButton)
            .find('#ipr-next-record').on('click', function (e) {
              //go to the next record
              if (!pm.ExecuteMethod("CanInvokeMethod", "GotoNextSet")) {
                alert('GotoNextSet is not allowed to invoke');
              } else {
                //invoking the goto next set
                var ps = SiebelApp.S_App.NewPropertySet();
                ps.SetProperty('SWEApplet', appletName);
                ps.SetProperty('SWEView', viewName);
                var ai = {
                //  cb: afterSelection
                }
                SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName].InvokeControlMethod('GotoNextSet', ps, ai)
              }
            }
          );

          $('#ipr-input-text').on('blur', function () {
            var newCaseNum = $(this).val();
            //TODO: CHECK IF VALUE ACTUALLY WAS CHANGED
            pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlName);
            pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlName, newCaseNum);
          });

          $('#ipr-input-check').on('change', function () {
            console.log('changed checkbox', $(this).prop('checked'));
            var newInfo = $(this).prop('checked') ? 'Y' : 'N';
            pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlInfo);
            pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlInfo, newInfo);
            if (controlInfo.IsPostChanges()) {
              if (pm.ExecuteMethod("CanUpdate", controlName.GetName())) {
                $('#ipr-input-text').removeAttr('readonly');
              } else {
                $('#ipr-input-text').attr('readonly', 'reaonly');
              }
            }
          });

          afterSelection();

          putVue(divId);
        }

        function putVue(divId) {
          $('head').append('<link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Material+Icons" rel="stylesheet"></link>');
          $('head').append('<link type="text/css"  rel="stylesheet" href="files/custom/vuetify.min.css"/>');
          $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui">');
          var html = '\
          <div id="app">                                                                      \n\
            <v-app>                                                                           \n\
              <v-flex>                                                                        \n\
                <v-layout row wrap>                                                           \n\
                <v-flex md6>                                                                  \n\
                  <v-text-field @input="nameChanged()" :readonly="caseNameRO" label="Case Name" v-model="caseName"></v-text-field>      \n\
                </v-flex>                                                                     \n\
                <v-flex md6>                                                                  \n\
                  <v-checkbox @change="infoCheckChanged()" label="Info Changed" v-model="infoChanged"></v-checkbox>                     \n\
                </v-flex>                                                                     \n\
                <v-flex md6>                                                                 \n\
                  <v-select :items="caseStatusArr" v-on:click.native="clickSelect" v-on:change="changeStatus" v-model="caseStatus" label="Status"></v-select>  \n\
                </v-flex>                                                                     \n\
                <v-flex md6>                                                                 \n\
                  <v-select :items="caseCategoryArr" v-on:change="changeCategory" v-model="caseCategory" label="Category"></v-select>  \n\
                </v-flex>                                                                     \n\
                <v-flex md6>                                                                  \n\
                    <v-btn v-on:click="saveButtonClick" color="primary">Save!</v-btn>         \n\
                </v-flex>                                                                     \n\
                <v-flex md6>                                                                  \n\
                    <v-btn v-on:click="nextButtonClick" color="primary">Next!</v-btn>         \n\
                </v-flex>                                                                     \n\
                </v-layout>                                                                   \n\
              </v-flex>                                                                       \n\
            </v-app>                                                                          \n\
          </div>';

          $('#' + divId).append(html);

          app = new Vue({
            el: '#app',
            created: function() {
              console.log('VUE created');
            },
            mounted: function() {
              console.log('VUE mounted');
              controlCategory = pm.ExecuteMethod("GetControl", 'Category');
              var arr = controlCategory.GetRadioGroupPropSet().childArray;
              for (var i=0; i < arr.length; i++) {
                //console.log(arr[i]);
                this.caseCategoryArr.push(arr[i].propArray.DisplayName);
              }
              this.afterSelection();
            },
            data: {
              caseName: '',
              caseStatus: '',
              caseCategory: '',
              infoChanged: false,
              canUpdateName: true,
              caseStatusArr: [],
              caseCategoryArr: []
            },
            computed: {
              caseNameRO: function () {
                return !this.canUpdateName;
              }
            },
            methods: {
              populateStatusArray: function(arr) {
                console.log(arr);
                this.caseStatusArr = [this.caseStatus];
                for (var i = 0; i < arr.length; i++) {
                  if ((arr[i] != '') && (arr[i] != this.caseStatus)) {
                    this.caseStatusArr.push(arr[i]);
                  }
                }
              },
              clickSelect: function() { //TODO: WHAT IS THE BEST EVENT FOR IT
                console.log('clicked select');
                controlStatus = pm.ExecuteMethod("GetControl", 'Status');
                console.log(controlStatus);
                var ps = SiebelApp.S_App.NewPropertySet();
                ps.SetProperty('SWEField', controlStatus.GetInputName());
                ps.SetProperty('SWEJI', false);
                console.log(ps);
                console.log('invoke GetQuickPickInfo')
                console.log(controlStatus.GetApplet().InvokeMethod('GetQuickPickInfo', ps));
                //console.log(pm.OnControlEvent('invoke_combo', controlStatus));
                debugger;
              },
              changeStatus: function(value) {
                console.log('changeStatus', arguments);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlStatus);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlStatus, value);
              },
              changeCategory: function(value) {
                console.log('changeCategory', arguments);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlCategory);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlCategory, value);
              },
              nameChanged: function() {
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlName);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlName, this.caseName);
              },
              infoCheckChanged: function() {
                //var controlInfo = SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName].GetControls()['InfoChanged'];
                var newInfo = this.infoChanged ? 'Y' : 'N';
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_FOCUS"), controlInfo);
                pm.OnControlEvent(consts.get("PHYEVENT_CONTROL_BLUR"), controlInfo, newInfo);
                if (controlInfo.IsPostChanges()) {
                  this.canUpdateName = pm.ExecuteMethod("CanUpdate", controlName.GetName());
                }

              },
              saveButtonClick: function() {
                SiebelApp.S_App.GetActiveView().SetActiveAppletInternal(SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName]);
                var ai = {
                  scope: {
                    cb: function () {
                      console.log('response in callback from save record >>>', arguments);
                      if (arguments[3]) {
                        console.log('save was successful');
                      } else {
                        console.log('save WAS NOT successful');
                      }
                    }
                  }
                }
                SiebelApp.CommandManager.GetInstance().InvokeCommand.call(SiebelApp.CommandManager.GetInstance, "*Browser Applet* *WriteRecord* * ", true, ai);
              },
              nextButtonClick: function() {
                if (!pm.ExecuteMethod("CanInvokeMethod", "GotoNextSet")) {
                  alert('GotoNextSet is not allowed to invoke ');
                } else {
                  //invoking the goto next set
                  var ps = SiebelApp.S_App.NewPropertySet();
                  ps.SetProperty('SWEApplet', appletName);
                  ps.SetProperty('SWEView', viewName);
                  var ai = {
                  //  cb: afterSelection TODO: DO we need it
                  }
                  SiebelApp.S_App.GetActiveView().GetAppletMap()[appletName].InvokeControlMethod('GotoNextSet', ps, ai)
                }
              },
              afterSelection: function() {
                console.log('after selection...');
                this.canUpdateName = pm.ExecuteMethod("CanUpdate", controlName.GetName());
                var currentRecord = pm.Get("GetRecordSet")[pm.Get("GetSelection")];
                this.infoChanged = currentRecord['Info Changed Flag'] === 'Y';
                this.caseName = currentRecord.Name;
                this.caseStatus = currentRecord.Status;
                this.caseStatusArr.push(this.caseStatus);
                this.caseCategory = currentRecord.Category;

                //var controlStatus = pm.ExecuteMethod("GetControl", 'Status');
                //pm.OnControlEvent('invoke_combo', controlStatus);
              }
            }
          });
        }

        function afterSelection() {
          var el = $("#ipr-input-text");
          el.val(pm.Get("GetRecordSet")[pm.Get("GetSelection")].Name);
          if (pm.ExecuteMethod("CanUpdate", controlName.GetName())) {
            el.removeAttr('readonly');
          } else {
            el.attr('readonly', 'reaonly');
          }
          var _infoChanged = pm.Get("GetRecordSet")[pm.Get("GetSelection")]['Info Changed Flag'];
          $("#ipr-input-check").prop('checked', _infoChanged == 'Y' ? true : false);

          if (app) {
            app.afterSelection();
          }
        }

        DefaultFormAppletPR.prototype.EndLife = function () {
          SiebelAppFacade.DefaultFormAppletPR.superclass.EndLife.apply(this, arguments);
        }

        return DefaultFormAppletPR;
      }()
      );
      return "SiebelAppFacade.DefaultFormAppletPR";
    })
}
