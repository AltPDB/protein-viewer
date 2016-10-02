// This code was written by Brian Peiris from AltspaceVR.  It has not yet been integrated into this application.

// This is the index.html code that was used in Brian's original app

//<!DOCTYPE html>
//<html>
//<head>
//  <title>TSkillman A-Frame Scene</title>
//  <script src="https://aframe.io/releases/0.2.0/aframe.min.js"></script>
//  <script src="https://cdn.rawgit.com/AltspaceVR/aframe-altspace-component/v0.2.2/dist/aframe-altspace-component.min.js"></script>
//  <script src="https://sdk.altvr.com/libs/altspace.js/0.15.0/altspace.js"></script>
//</head>

//<body>
//  <a-scene altspace="usePixelScale: true">
//    <a-entity scale="50 50 50" position="0 -1 0" obj-model="obj: url(2vaa-newRibbons3.obj); mtl: url(2vaa-newRibbons3.mtl)"></a-entity>
//  </a-scene>
//  <script src="laser.js"></script>
//</body>
//</html>
  

var Object3DSync = altspace.utilities.behaviors.Object3DSync;
var SteamVRInputBehavior = altspace.utilities.behaviors.SteamVRInput;
var SteamVRTrackedObjectBehavior = altspace.utilities.behaviors.SteamVRTrackedObject;

var config = { authorId: 'tlskillman', appId: 'MoleculeViewer' };
var scene = document.querySelector('a-scene').object3D;
var sceneSync;
var steamVRInput;

var laserVisibilityBehavior = {
  awake: function (obj) {
    var objData = obj.getBehaviorByType('Object3DSync').dataRef;
    objData.child('visible').on('value', function (snapshot) {
      obj.children[0].visible = snapshot.val();
    }.bind(this));
  }
};

function createLaser (data) {
  var laserContainer = new THREE.Group();
  laserContainer.addBehaviors(
    new SteamVRTrackedObjectBehavior(data.hand),
    new Object3DSync({position: true, rotation: true}),
    laserVisibilityBehavior
  );
  scene.add(laserContainer);
 
  var laserObj = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.01, 5),
    new THREE.MeshBasicMaterial({color: 'red'})
  );
  laserObj.position.z = 2.5 * 50;
  laserObj.scale.multiplyScalar(50);
  laserContainer.add(laserObj);

  return laserContainer;
};

var laserBehavior = {
  update: function () {
    var controller = steamVRInput.firstController;
    if (controller && !this.laser) { 
      this.laser = sceneSync.instantiate('laser', {hand: controller.hand});
      this.laserData = this.laser.getBehaviorByType('Object3DSync').dataRef;
    }
    if (controller && controller.buttons[SteamVRInputBehavior.BUTTON_TRIGGER].pressed) {
      if (!this.visible) {
        this.visible = true;
        this.laserData.child('visible').set(this.visible);
      }
    }
    else if (this.visible) {
      this.visible = false;
      this.laserData.child('visible').set(this.visible);
    }
  }
};

function init (connection) {
  sceneSync = new altspace.utilities.behaviors.SceneSync(connection.instance, {
    instantiators: {
      laser: createLaser
    }
  });
  steamVRInput = new SteamVRInputBehavior();
  scene.addBehaviors(steamVRInput, sceneSync, laserBehavior);
}

altspace.utilities.sync.connect(config).then(init);

function update () {
  requestAnimationFrame(update);
  scene.updateAllBehaviors();
}
update();
