var laterQueue = []
var laterRunning = []

function doLater(priority, callback) {
 if (laterRunning.filter(p => p < priority).length == 0) {
  laterRunning.push(priority)
  doNow(priority, callback)
 }
 else {
  var i = 0;
  for (; i < laterQueue.length; i++) {
   if (laterQueue[i].p > priority) {
    break
   }
  }
  laterQueue.splice(i, 0, {p: priority, c: callback})
 }
}

function doNow(priority, callback) {
 callback(function() {
  laterRunning.splice(laterRunning.indexOf(priority), 1)
  if (laterQueue.length != 0) {
   var m = Math.min(...laterRunning)
   laterQueue.forEach(function(f, i) {
    laterQueue.splice(i, 1)
    laterRunning.push(f.p)
    doNow(f.p, f.c)
   });
  }
 }.bind(priority))
}
