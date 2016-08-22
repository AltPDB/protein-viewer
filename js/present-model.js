'use strict';

// set up global variables
var sync, renderer, camera, model;
var scene = new THREE.Scene();
var root = new THREE.Object3D();
scene.add(root);

// start animating
window.requestAnimationFrame(function animate(timestamp)
{
	window.requestAnimationFrame(animate);
	scene.updateAllBehaviors();
	renderer.render(scene, camera);
});

function computeObjectRadius(o, center)
{
	center = center || new THREE.Vector3(0,0,0);
	var max = 0;

	if(o instanceof THREE.Mesh)
	{
		var vertexList = o.geometry.getAttribute('position');
		for(var i=0; i<vertexList.count; i++)
		{
			var vert = new THREE.Vector3().fromArray( Array.prototype.slice.call(vertexList.array, 3*i, 3*i+3) );
			var test = vert.distanceTo(center);
			if(test > max) max = test;
		}
	}
	else
	{
		o.children.forEach(function(child)
		{
			var inverse = new THREE.Matrix4().getInverse(child.matrix);
			var test = computeObjectRadius(child, center.clone().applyMatrix4(inverse));
			if(test > max) max = test;
		});
	}

	return max;
}

// start loading everything in the right order
async.parallel(
	[
		loadModel,
		setupRenderer,
		setupEnclosure
		//setupSync,
		//setupUI
	],
	start
);

function loadModel(done)
{
	// these should be only those molecules that
	var defaultTransform = {
		'2VAA': new THREE.Matrix4().fromArray([0.025214113295078278, 0, 0, 0, 0, -5.5986578251406355e-18, 0.025214113295078278, 0, 0, -0.025214113295078278, -5.5986578251406355e-18, 0, 0, 0, 0.800000011920929, 1]),
		'3UTQ': new THREE.Matrix4().fromArray([0.01705673336982727, 2.6780650619506564e-18, 0.01705673336982727, 0, -0.01705673336982727, 5.356130123901313e-18, 0.01705673336982727, 0, 0, -0.02412186563014984, 8.03419518585197e-18, 0, 0, 0, 0.800000011920929, 1]),
		'4X5W': new THREE.Matrix4().fromArray([0.019939063116908073, 0, 0, 0, 0, -0.01633312553167343, -0.011436576955020428, 0, 0, 0.011436576955020428, -0.01633312553167343, 0, 0, 0, 0.800000011920929, 1]),
		'1AQD': new THREE.Matrix4().fromArray([0.016878578811883926, 0, -0.0069913361221551895, 0, 0.0069913361221551895, 1.0141466747652247e-17, 0.016878578811883926, 0, 0, -0.018269242718815804, 1.0141466747652247e-17, 0, 0, 0, 0.800000011920929, 1])
	};

	if(!/[?&]noribbon/.test(window.location.search))
		document.getElementById('ribbon').style.color = '#87ceeb';
	if(!/[?&]noball/.test(window.location.search))
		document.getElementById('ball').style.color = '#87ceeb';

	var molId = /[?&]molecule=(\w+)/.exec(window.location.search);
	if(!molId){
		document.getElementById('loading').style.display = 'none';
		return done();
	}

	molId = molId[1];

	var menuItem = document.getElementById(molId);
	if(menuItem) menuItem.style.color = '#87ceeb';

	var molecule = new THREE.Object3D();

	async.parallel([

		// load pdb file
		function(done)
		{
			if( /[?&]noball/.test(window.location.search) )
				return done();

			var loader = new THREE.PDBLoader();
			loader.load('models/pdb/'+molId+'.pdb', function(model)
			{
				done(null, model);
			}, null, done);
		},

		// load ribbon file
		function(done)
		{
			if( /[?&]noribbon/.test(window.location.search) )
				return done();

			var colors = [0xd804e0, 0xcef615, 0x3e39fb, 0xff3737, 0x04e3d1,
				0x2e8a1c, 0xcfcfcf, 0xffbb18, 0xffb4b4, 0xb8b4ff];

			var loader = new THREE.glTFLoader();
			loader.load('models/ribbon/'+molId+'.gltf', function(model)
			{
				var ribbon = model.scene.children[0].children[0];
				window.ribbon = ribbon;
				ribbon.matrix.identity();
				ribbon.matrix.decompose(ribbon.position, ribbon.quaternion, ribbon.scale);

				ribbon.children.forEach(function(o, i){
					o.traverse(function(o2){
						if(o2 instanceof THREE.Mesh){
							o2.material.color.set(colors[i]);
							o2.material.side = THREE.DoubleSide;
						}
					});
				});

				done(null, ribbon);
			});
		}],

		function(err, results)
		{
			if(err)
				done(err);
			else {
				var model = new THREE.Object3D();

				if(results[0]) model.add(results[0]);
				if(results[1]) model.add(results[1]);

				if(defaultTransform[molId])
					model.applyMatrix( defaultTransform[molId] );
				else
				{
					var radius = computeObjectRadius(model);
					model.scale.multiplyScalar(1.0/radius);
					model.position.set(0, 0, 0.8);
				}

				done(null, model);
			}

			document.getElementById('loading').style.display = 'none';
		}
	);
}


function setupRenderer(done)
{
	if(altspace.inClient){
		renderer = altspace.getThreeJSRenderer();
	}
	else {
		// set up preview renderer, in case we're out of world
		renderer = new THREE.WebGLRenderer();
		renderer.setSize(1024, 1024);
		renderer.setClearColor( 0 );
		document.body.appendChild(renderer.domElement);

		//camera = new THREE.PerspectiveCamera(90, 1, 0.01, 10000);
		camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
		camera.up.set(0,0,1);
		camera.position.set(2, 0, 1.5);
		camera.lookAt(new THREE.Vector3(0, 0, 1.5));
		root.add(camera);

		// add bounding box
		/*var box = new THREE.Mesh(
			new THREE.BoxGeometry(3,3,3),
			new THREE.MeshBasicMaterial({wireframe: true})
		);
		box.position.set(0,0,1.5);
		root.add(box);*/
	}


	done();
}

function setupEnclosure(done)
{
	if(altspace.inClient)
	{
		altspace.getEnclosure().then(function(e){
			root.position.setY(-e.innerHeight/2);
			root.scale.multiplyScalar(e.pixelsPerMeter);
			root.rotation.set( -Math.PI/2, 0, 0 );
			done(e.innerDepth===1);
		});
	}
	else {
		done();
	}
}

/*function setupSync(done)
{
	if(altspace.inClient)
	{
		altspace.utilities.sync.connect({
			authorId: 'Derogatory',
			appId: 'protein-viewer'
		}).then(function(conn)
		{
			sync = conn;
			done();
		},
		function(err)
		{
			console.warn('Could not connect to firebase:', err);
			done();
		});
	}
	else {
		done();
	}
}

function setupUI(done)
{
	done();
}*/

function start(err, results)
{
	if(err){
		console.error(err);
		return;
	}
	console.log(results);

	if(results[0]){
		window.molecule = results[0];
		root.add(molecule);
	}

}

