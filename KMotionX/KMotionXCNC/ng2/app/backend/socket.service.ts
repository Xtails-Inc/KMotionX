import {Injectable} from 'angular2/core';
import {LogService} from "../log/log.service"
import {KMXUtil} from '../util/kmxutil';
import {LogLevel} from '../log/log.level';
//import {LogLevel} from '../kmx';
//import {LogLevel} from 'kmxlog/log.level';

/*
class LOG_TYPE {
  static NONE = 0;
  static SEND = 1;
  static RECEIVE = 2;
  static ERROR = 3;
  static PING = 4;
}
*/

@Injectable()
export class SocketService {
  data = {
    raw: {},
    interpreting: false,
    feedHold: false,
    dro: [],
    timeStamp: "",
    connected: false,
    simulating: false,
    currentLine: -1,
    gcodeFile: "",
    machineSettings: ""
  }

  private socketHandlers = {

    STATUS: this.statusHandler,// 0: Non blocking callback. Called from the interpreter in different thread
    COMPLETE: this.completeHandler,// 1: Non blocking callback. Called from the interpreter in different thread
    ERR_MSG: this.errorMessageHandler,// 2: Non blocking callback
    CONSOLE: this.consoleHandler,// 3: Non blocking callback, event though it has return value??
    USER: this.userHandler,// 4: Blocking callback. Called from the interpreter in different thread
    USER_M_CODE: this.userMCodeHandler,// 5: Blocking callback. Called from the interpreter in different thread
    MESSAGEBOX: this.messageHandler// 6: Blocking callback. However there is no need to block OK only boxes.
  }
  private socketWorker: Worker;

  constructor(private kmxLogger: LogService) {
    this.data = {
      raw: {},
      interpreting: false,
      feedHold: false,
      dro: [0,0,0],
      timeStamp: "N/A",
      connected: false,
      simulating: false,
      currentLine: -1,
      gcodeFile: "",
      machineSettings: ""
    }
    var _this = this;
    var url = 'ws://' + window.location.host + '/ws';
    KMXUtil.getSingletonWorker("dist/app/backend/socket.loader.js", this.workerMessage.bind(this))
      .then(
      function(worker) {
        _this.socketWorker = worker;
      }, function(reason) {
        console.error(reason);
      });
      
      
    //does not seem to work, at least not in chrome
    //      window.onbeforeunload = function(){
    //        socketWorker.postMessage({command:'disconnect'})
    //      }
  }



  workerMessage(event:MessageEvent) {
    //messageCount++;
    //if(messageCount%5 == 0){
    //console.info("Messages received", messageCount);
    //}
    if (event.data === 'WorkerReady') {
      var url = 'ws://' + window.location.host + '/ws';
      this.socketWorker.postMessage({ command: 'connect', url: url });
      return;
    }
    var data = event.data;
    if (data.data) {
      var obj = data.message;
      if (obj.KMX) {
        return;
      }
      var handler = this.socketHandlers[obj.payload.type].bind(this);// || _this.defaultHandler;
      var ret = handler(obj.payload);
      if (obj.payload.block === true) {
        //only ack messages that require users answer here
        this.acknowledge(obj.id, ret);
      }
    } else if (data.status) {
      //var json = angular.toJson(data.message,true);
      //logHandler(json, LOG_TYPE.NONE);
      //console.log(json);
        
      //Event is coming outside of angular.
      //enter digest cycle with scope.apply
      //$rootScope.$apply(function() {
      var raw = data.message;
      //SocketService.data.raw = raw;
      this.data.interpreting = raw.interpreting,
      this.data.feedHold = raw.stopImmediateState > 0; //pause
      this.data.dro = raw.dro;
      this.data.timeStamp = raw.timeStamp;
      this.data.connected = raw.connected;
      this.data.simulating = raw.simulate;
      this.data.currentLine = raw.currentLine;
      this.data.gcodeFile = raw.gcodeFile;
      this.data.machineSettings = raw.machineSettingsFile;
      //});
    } else if (data.log) {
      this.logHandler(data.message, data.type);
    }
  }

  public acknowledge(id, ret) {
    this.socketWorker.postMessage({ command: 'acknowledge', id: id, ret: ret });
  }

  statusHandler(payload) {
    this.kmxLogger.log('status', 'Line: ' + payload.line + " - " + payload.message);
  }
  completeHandler(payload) {
    this.kmxLogger.log('status', 'Done Line: ' + payload.line + " Status: " + payload.status + " Sequence " + payload.sequence + " - " + payload.message);
  }
  errorMessageHandler(payload) {
    this.kmxLogger.log('error', payload.message);
  }
  consoleHandler(payload) {
    this.kmxLogger.log('console', payload.message);
  }

  userHandler(payload) {
    if (confirm('USR: ' + payload.message + ' ?')) {
      return 0; // zero is true for this callback
    } else {
      return 1;
    }
  }
  userMCodeHandler(payload) {
    if (confirm('Are you sure you want to continue after M' + payload.code + ' ?')) {
      return 0; // zero is true for this callback
    } else {
      return 1;
    }
  }

  messageHandler(payload) {
    alert(payload.message);
    return 0;
  }

  logHandler(message, type) {
    if (this.kmxLogger.logExist('output')) {
      var style = '';
      var fragment = document.createDocumentFragment();
      var div = document.createElement('div');
      fragment.appendChild(div);
      if (type == LogLevel.NONE) {

      } else {
        var sp = document.createElement('span');
        if (type == LogLevel.SEND) {
          sp.style.color = 'green';
          sp.appendChild(document.createTextNode("SENT: "));
        } else if (type == LogLevel.RECEIVE) {
          sp.style.color = 'blue';
          sp.appendChild(document.createTextNode("RECEIVED: "));
        } else if (type == LogLevel.ERROR) {
          sp.style.color = 'red';
          sp.appendChild(document.createTextNode("ERROR: "));
        } else if (type == LogLevel.PING) {
          sp.style.color = 'blue';
          sp.appendChild(document.createTextNode("PING..."));
        }
        div.appendChild(sp);
      }
      div.appendChild(document.createTextNode(message));

      this.kmxLogger.logFragment('output', fragment);
    } else {
      if (type == LogLevel.NONE) {
        console.info('---', message);
      } else if (type == LogLevel.SEND) {
        console.info('SENT', message);
      } else if (type == LogLevel.RECEIVE) {
        console.info('RECEIVED', message);
      } else if (type == LogLevel.ERROR) {
        console.error('ERROR', message);
      } else if (type == LogLevel.PING) {
        console.info('PING...', message);
      }

    }
  }
}