const fs = require("fs");
const os = require("os");
const path = require("path");
const luxon = require("luxon");
const png = require("png-metadata");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
var Positioner = require("electron-positioner");
var ffmpeg = require("fluent-ffmpeg");
//const { readFileSync } = require("png-metadata");
const cp = require("child_process");

const expandTilde = (filepath) => {
  var home = os.homedir();

  if (filepath.charCodeAt(0) === 126 /* ~ */) {
    if (filepath.charCodeAt(1) === 43 /* + */) {
      return path.join(process.cwd(), filepath.slice(2));
    }
    return home ? path.join(home, filepath.slice(1)) : filepath;
  }
  return filepath;
};

fs.watch(expandTilde("~/Pictures/screenshots/"), (eventType, filename) => {
  if (filename.startsWith("Screen Shot ") && eventType == "rename") {
    //console.log('Screenshot file created with namme: "' + filename + '"');
    noteApp(expandTilde("~/Pictures/screenshots/") + filename);
  }
});

var genCustomFileName = (filename) => {
  // console.log("Using default custom screenshot name.");
  var basename = path.basename(filename);
  var date = luxon.DateTime.fromObject({
    year: Number(basename.substring(12, 16)),
    month: Number(basename.substring(17, 19)),
    day: Number(basename.substring(20, 22)),
    hour:
      basename.substring(50, 51) == "P"
        ? Number(basename.substring(26, 27))
        : Number(basename.substring(26, 27)) + 12,
    minute: Number(basename.substring(28, 30)),
    second: Number(basename.substring(31, 33)),
    zone: "Australia/Sydney",
  });
  totalFileName =
    expandTilde("~/Pictures/screenshots/") + "scr_" + date.toISO() + ".png";
  return totalFileName;
};

var noteApp = (filename) => {
  var createWindow = () => {
    const win = new BrowserWindow({
      width: 224,
      height: 30,
      webPreferences: {
        nodeIntegration: true,
      },
      titleBarStyle: "hidden",
      vibrancy: "window",
      resizable: false,
    });
    win.loadFile("index.html");
    var positioner = new Positioner(win);
    positioner.move("bottomLeft");
  };

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    fileGen(filename);
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.on("openSaveDialogue", () => {
    fileGen(
      dialog.showSaveDialogSync({
        title: "Hello",
        properties: ["createDirectory"],
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
      })
    );
  });

  ipcMain.on("noSave", () => {
    console.log("Not saving...");
    if (!fs.existsSync(filename)) {
      fs.unlinkSync(filename, (err) => {
        if (err) throw err;
        console.log("Default screenshot was deleted.");
      });
    }
    app.quit();
  });
};

var fileGen = (filename, customName = false) => {
  if (customName) {
    /*var command = ffmpeg(filename)
      .outputOptions("-map_metadata -1", "-c:v copy", "-c:a copy")
      .output(customName)
      .on("end", function () {
        console.log("Finished processing");
      })
      .run();*/
    fs.writeFileSync(customName, fs.readFileSync(filename));
    fs.unlinkSync(filename);
  } else {
    var customName = genCustomFileName(filename);
    /*var command = ffmpeg(filename)
      .outputOptions("-map_metadata -1", "-c:v copy", "-c:a copy")
      .output(name)
      .on("end", function () {
        console.log("Finished processing");
      })
      .run();
    */
    fs.writeFileSync(customName, fs.readFileSync(filename));
    fs.unlinkSync(filename);
  }
  cp.execSync(
    "curl -F'file=@" + filename + "' https://0x0.st",
    (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(stdout);
    }
  );
  app.quit();
};
