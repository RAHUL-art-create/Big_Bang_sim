// --------------------------------------------------------------------------------
      // Global variables for scene, camera, renderer, controls, and simulation objects.
      // --------------------------------------------------------------------------------
      let scene, camera, renderer, controls, composer;
      let particleSystem, particlePositions, particleVelocities;
      let galaxySystem = null; // Will hold the galaxy cluster (added later)
      let nebula = null; // Will hold the nebula background (added later)
      let particleCount = 20000; // Number of particles for the Big Bang explosion
      let params; // Object to store parameters controlled by the UI
      let clock = new THREE.Clock(); // Clock to keep track of elapsed time

      // Initialize the scene and start the animation loop.
      init();
      animate();

      // --------------------------------------------------------------------------------
      // Function: init()
      // Sets up the scene, camera, renderer, lights, particle system, post-processing, etc.
      // --------------------------------------------------------------------------------
      function init() {
        // Create a new scene.
        scene = new THREE.Scene();

        // Create a perspective camera.
        camera = new THREE.PerspectiveCamera(
          60,
          window.innerWidth / window.innerHeight,
          0.1,
          10000
        );
        camera.position.set(0, 0, 200);

        // Create the WebGL renderer with antialiasing and set its size.
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true; // Enable shadow maps for added realism.
        document.body.appendChild(renderer.domElement);

        // Add OrbitControls so the user can explore the scene.
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth out camera movement.
        controls.dampingFactor = 0.05;

        // Add ambient light to gently light the scene.
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        scene.add(ambientLight);

        // Add a point light at the origin to simulate the intense energy of the Big Bang.
        const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
        pointLight.position.set(0, 0, 0);
        pointLight.castShadow = true;
        scene.add(pointLight);

        // Set up post-processing using EffectComposer and add a bloom pass to simulate volumetric light.
        composer = new THREE.EffectComposer(renderer);
        let renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        let bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          1.5, // strength
          0.4, // radius
          0.85 // threshold
        );
        bloomPass.threshold = 0;
        bloomPass.strength = 2;
        bloomPass.radius = 0.5;
        composer.addPass(bloomPass);

        // Create the primary particle system representing the initial Big Bang explosion.
        createParticleSystem();

        // Set up UI controls with dat.GUI.
        setupGUI();

        // Listen for window resize events.
        window.addEventListener("resize", onWindowResize, false);
      }

      // --------------------------------------------------------------------------------
      // Function: createParticleSystem()
      // Creates a particle system where all particles originate at the singularity and
      // are assigned random velocities that will cause them to expand outward.
      // --------------------------------------------------------------------------------
      function createParticleSystem() {
        // Create a BufferGeometry to store particle positions.
        const geometry = new THREE.BufferGeometry();

        // Allocate arrays for particle positions and velocities.
        particlePositions = new Float32Array(particleCount * 3);
        particleVelocities = new Float32Array(particleCount * 3);

        // Initialize each particle at (0,0,0) with a random outward velocity.
        for (let i = 0; i < particleCount; i++) {
          // All particles start at the singularity (with a tiny offset if desired).
          particlePositions[i * 3] = 0;
          particlePositions[i * 3 + 1] = 0;
          particlePositions[i * 3 + 2] = 0;

          // Randomly determine the particle's direction (spherical coordinates).
          let theta = Math.random() * 2 * Math.PI;
          let phi = Math.acos(Math.random() * 2 - 1);
          let speed = Math.random() * 0.5 + 0.5; // Speed between 0.5 and 1.0.
          particleVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
          particleVelocities[i * 3 + 1] =
            speed * Math.sin(phi) * Math.sin(theta);
          particleVelocities[i * 3 + 2] = speed * Math.cos(phi);
        }

        // Attach the positions to the geometry.
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(particlePositions, 3)
        );

        // Create a PointsMaterial using a custom sprite texture for a soft glow.
        const sprite = generateSprite();
        const material = new THREE.PointsMaterial({
          size: 2,
          map: sprite,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          transparent: true,
          opacity: 0.8,
          color: 0xffffff,
        });

        // Create the particle system and add it to the scene.
        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
      }

      // --------------------------------------------------------------------------------
      // Function: generateSprite()
      // Generates a circular, glowing sprite texture using the canvas element.
      // --------------------------------------------------------------------------------
      function generateSprite() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext("2d");

        // Create a radial gradient for the glow.
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.2, "rgba(255, 200, 200, 0.8)");
        gradient.addColorStop(0.4, "rgba(200, 100, 100, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);

        // Create and return a texture from the canvas.
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      }

      // --------------------------------------------------------------------------------
      // Function: setupGUI()
      // Sets up a dat.GUI panel to let users control simulation parameters.
      // --------------------------------------------------------------------------------
      function setupGUI() {
        // Define default parameters.
        params = {
          expansionSpeed: 50, // Scales how fast the particles expand.
          particleSize: 2, // Particle point size.
          bloomStrength: 2, // Bloom effect strength.
          bloomRadius: 0.5, // Bloom effect radius.
          bloomThreshold: 0, // Bloom effect threshold.
        };

        // Create a GUI panel.
        const gui = new dat.GUI({ width: 300 });
        gui.add(params, "expansionSpeed", 10, 200).name("Expansion Speed");
        gui
          .add(params, "particleSize", 1, 10)
          .name("Particle Size")
          .onChange((value) => {
            particleSystem.material.size = value;
          });
        gui
          .add(params, "bloomStrength", 0, 5)
          .name("Bloom Strength")
          .onChange((value) => {
            composer.passes[1].strength = value;
          });
        gui
          .add(params, "bloomRadius", 0, 1)
          .name("Bloom Radius")
          .onChange((value) => {
            composer.passes[1].radius = value;
          });
        gui
          .add(params, "bloomThreshold", 0, 1)
          .name("Bloom Threshold")
          .onChange((value) => {
            composer.passes[1].threshold = value;
          });
      }

      // --------------------------------------------------------------------------------
      // Function: onWindowResize()
      // Adjusts the camera aspect ratio and renderer size when the browser window resizes.
      // --------------------------------------------------------------------------------
      function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      }

      // --------------------------------------------------------------------------------
      // Function: animate()
      // The main animation loop: updates particle positions, adds additional cosmic
      // elements as time progresses, and renders the scene.
      // --------------------------------------------------------------------------------
      function animate() {
        requestAnimationFrame(animate);

        // Compute the time elapsed since the last frame.
        const delta = clock.getDelta();

        // Update the positions of the explosion particles.
        updateParticles(delta);

        // Gradually add additional elements to the universe:
        // After 10 seconds, add a galaxy cluster; after 15 seconds, add a nebula.
        let elapsed = clock.elapsedTime;
        if (elapsed > 10 && !galaxySystem) {
          createGalaxyCluster();
        }
        if (elapsed > 15 && !nebula) {
          createNebula();
        }

        // Update camera controls.
        controls.update();

        // Render the scene using the post-processing composer (which includes bloom).
        composer.render(delta);
      }

      // --------------------------------------------------------------------------------
      // Function: updateParticles()
      // Moves each particle outward from the center by updating its position based on
      // its velocity and the user-controlled expansion speed.
      // --------------------------------------------------------------------------------
      function updateParticles(delta) {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          let index = i * 3;
          positions[index] +=
            particleVelocities[index] * params.expansionSpeed * delta;
          positions[index + 1] +=
            particleVelocities[index + 1] * params.expansionSpeed * delta;
          positions[index + 2] +=
            particleVelocities[index + 2] * params.expansionSpeed * delta;
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }

      // --------------------------------------------------------------------------------
      // Function: createGalaxyCluster()
      // Creates a secondary particle system to simulate the appearance of galaxies and
      // star clusters in the later universe.
      // --------------------------------------------------------------------------------
      function createGalaxyCluster() {
        const galaxyCount = 5000; // Number of galaxy particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(galaxyCount * 3);

        // Randomly distribute galaxy particles in a large spherical region.
        for (let i = 0; i < galaxyCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 1000;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
        }
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );

        // Create a PointsMaterial for the galaxy cluster with smaller, fainter points.
        const material = new THREE.PointsMaterial({
          size: 1.5,
          color: 0xaaaaaa,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.5,
          depthTest: false,
        });

        // Create the galaxy particle system and add it to the scene.
        galaxySystem = new THREE.Points(geometry, material);
        scene.add(galaxySystem);
      }

      // --------------------------------------------------------------------------------
      // Function: createNebula()
      // Creates a large, semi-transparent sphere with a custom-generated texture to
      // simulate a nebula that forms as the universe expands.
      // --------------------------------------------------------------------------------
      function createNebula() {
        const nebulaGeometry = new THREE.SphereGeometry(500, 32, 32);
        const nebulaMaterial = new THREE.MeshBasicMaterial({
          map: generateNebulaTexture(),
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.7,
        });
        nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        scene.add(nebula);
      }

      // --------------------------------------------------------------------------------
      // Function: generateNebulaTexture()
      // Uses canvas drawing to create a nebula-like texture with a radial gradient and
      // random noise to simulate stars and gaseous clouds.
      // --------------------------------------------------------------------------------
      function generateNebulaTexture() {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");

        // Create a radial gradient as the base of the nebula.
        const gradient = context.createRadialGradient(
          size / 2,
          size / 2,
          size / 8,
          size / 2,
          size / 2,
          size / 2
        );
        gradient.addColorStop(0, "rgba(50, 0, 100, 0.8)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        // Add random noise dots to simulate stars and gas.
        for (let i = 0; i < 1000; i++) {
          context.fillStyle = "rgba(255,255,255," + Math.random() * 0.1 + ")";
          const x = Math.random() * size;
          const y = Math.random() * size;
          context.fillRect(x, y, 1, 1);
        }
        return new THREE.CanvasTexture(canvas);
      }