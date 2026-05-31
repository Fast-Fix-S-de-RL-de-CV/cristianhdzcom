"use client";
import { useEffect, useRef } from "react";

/**
 * Hero3D — "Modern Visual" (aura geométrica 3D) montado IN-PAGE.
 *
 * Antes vivía en un iframe (fondo no interactivo) porque un iframe a pantalla
 * completa atrapa la rueda del mouse. Aquí lo portamos al documento para que
 * sea INTERACTIVO sin romper el scroll:
 *   - enableZoom:false  → la rueda NO la consume OrbitControls → hace scroll
 *     normal de la página.
 *   - enableRotate solo en punteros finos (mouse): arrastras para rotar en
 *     desktop; en táctil queda en auto-rotación y el dedo desliza la página.
 *   - autoRotate:true   → siempre vivo.
 *
 * Three.js + addons se cargan desde esm.sh en runtime (webpackIgnore) para no
 * pasar por el bundler, igual que el widget original.
 */
export function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let rafId = 0;
    let cleanup = () => {};

    (async () => {
      const [THREE, oc, ec, rp, ub, fl, tg] = await Promise.all([
        import(/* webpackIgnore: true */ "https://esm.sh/three"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/controls/OrbitControls.js"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/postprocessing/EffectComposer.js"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/postprocessing/RenderPass.js"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/postprocessing/UnrealBloomPass.js"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/loaders/FontLoader.js"),
        import(/* webpackIgnore: true */ "https://esm.sh/three/addons/geometries/TextGeometry.js"),
      ]);
      if (disposed || !mountRef.current) return;
      const { OrbitControls } = oc;
      const { EffectComposer } = ec;
      const { RenderPass } = rp;
      const { UnrealBloomPass } = ub;
      const { FontLoader } = fl;
      const { TextGeometry } = tg;

      const W = () => mount.clientWidth || window.innerWidth;
      const H = () => mount.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(330522);
      scene.fog = new THREE.FogExp2(330522, 0.008);

      const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 1000);
      camera.position.set(3, 2, 5);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);

      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(W(), H()), 1.2, 0.3, 0.85);
      bloomPass.threshold = 0.1;
      bloomPass.strength = 0.8;
      bloomPass.radius = 0.5;
      const composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.2;
      controls.enableZoom = false; // la rueda hace scroll de la página, no zoom
      controls.enablePan = false;
      controls.enableRotate = true; // arrastrar para rotar (desktop y móvil)
      controls.rotateSpeed = 1;
      controls.target.set(0, 0, 0);
      // touch-action: pan-y -> swipe VERTICAL = scroll de la página; swipe
      // HORIZONTAL = rota el objeto. (OrbitControls pondría 'none' por defecto,
      // lo que atraparía el scroll en móvil.)
      renderer.domElement.style.touchAction = "pan-y";

      // Encuadra la escena según el aspect: en pantallas verticales (móvil)
      // aleja la cámara para que el texto 3D y el aura no se corten ni se vean
      // enormes. En desktop (aspect ancho) no cambia el look.
      const frame = () => {
        const a = W() / H();
        const vHalf = (camera.fov * Math.PI) / 360; // (fov/2) en radianes
        const hHalf = Math.atan(Math.tan(vHalf) * a);
        const needed = 2.1 / Math.max(Math.tan(hHalf), 0.0001);
        const radius = Math.max(6.2, needed);
        const dx = camera.position.x - controls.target.x;
        const dy = camera.position.y - controls.target.y;
        const dz = camera.position.z - controls.target.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        camera.position.set(
          controls.target.x + (dx / len) * radius,
          controls.target.y + (dy / len) * radius,
          controls.target.z + (dz / len) * radius,
        );
        camera.updateProjectionMatrix();
        controls.update();
      };
      frame();

      const ambientLight = new THREE.AmbientLight(2236962);
      scene.add(ambientLight);
      const mainLight = new THREE.DirectionalLight(16777215, 1.2);
      mainLight.position.set(2, 3, 4);
      scene.add(mainLight);
      const backLight = new THREE.PointLight(4482764, 0.6);
      backLight.position.set(-2, 1, -3);
      scene.add(backLight);
      const fillLight = new THREE.PointLight(16755302, 0.5);
      fillLight.position.set(1.5, 1, 2);
      scene.add(fillLight);
      const colorLight = new THREE.PointLight(16729258, 0.8);
      colorLight.position.set(1, 1, 2);
      scene.add(colorLight);

      // Estrellas de fondo
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(2400);
      for (let e = 0; e < 800; e++) {
        starPositions[3 * e] = 200 * (Math.random() - 0.5);
        starPositions[3 * e + 1] = 100 * (Math.random() - 0.5);
        starPositions[3 * e + 2] = 80 * (Math.random() - 0.5) - 40;
      }
      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const stars = new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({ color: 11193599, size: 0.08, transparent: true, opacity: 0.6 }),
      );
      scene.add(stars);

      // Icosaedro núcleo + wireframe
      const geometryIco = new THREE.IcosahedronGeometry(1.1, 0);
      const coreMesh = new THREE.Mesh(
        geometryIco,
        new THREE.MeshStandardMaterial({
          color: 4881052,
          emissive: 1122867,
          roughness: 0.28,
          metalness: 0.75,
          flatShading: false,
          transparent: true,
          opacity: 0.92,
        }),
      );
      scene.add(coreMesh);
      const wireframeIco = new THREE.Mesh(
        geometryIco,
        new THREE.MeshBasicMaterial({ color: 6737151, wireframe: true, transparent: true, opacity: 0.25 }),
      );
      wireframeIco.scale.setScalar(1.08);
      scene.add(wireframeIco);

      // Anillo de partículas
      const ringGeometry = new THREE.BufferGeometry();
      const ringPositions = new Float32Array(3600);
      const ringColors = new Float32Array(3600);
      for (let e = 0; e < 1200; e++) {
        const t = (e / 1200) * Math.PI * 2;
        const o = 1.55;
        ringPositions[3 * e] = Math.cos(t) * o;
        ringPositions[3 * e + 1] = 0.35 * Math.sin(3 * t);
        ringPositions[3 * e + 2] = Math.sin(t) * o;
        ringColors[3 * e] = 0.4 + 0.6 * Math.sin(t);
        ringColors[3 * e + 1] = 0.3 + 0.7 * Math.cos(1.7 * t);
        ringColors[3 * e + 2] = 0.8 + 0.2 * Math.sin(2.3 * t);
      }
      ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
      ringGeometry.setAttribute("color", new THREE.BufferAttribute(ringColors, 3));
      const ringParticles = new THREE.Points(
        ringGeometry,
        new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(ringParticles);

      // Toros
      const torusMat = new THREE.MeshStandardMaterial({
        color: 8956671,
        emissive: 2254506,
        roughness: 0.3,
        metalness: 0.9,
      });
      const torusRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.045, 64, 500), torusMat);
      scene.add(torusRing);
      const torusRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.68, 0.03, 64, 500),
        new THREE.MeshStandardMaterial({ color: 16755336, emissive: 4465152, roughness: 0.5, metalness: 0.7 }),
      );
      scene.add(torusRing2);

      // Nube de partículas
      const cloudGeo = new THREE.BufferGeometry();
      const cloudPositions = new Float32Array(2400);
      for (let e = 0; e < 800; e++) {
        cloudPositions[3 * e] = 5 * (Math.random() - 0.5);
        cloudPositions[3 * e + 1] = 3 * (Math.random() - 0.5);
        cloudPositions[3 * e + 2] = 4 * (Math.random() - 0.5) - 1;
      }
      cloudGeo.setAttribute("position", new THREE.BufferAttribute(cloudPositions, 3));
      const cloudPoints = new THREE.Points(
        cloudGeo,
        new THREE.PointsMaterial({
          color: 7842559,
          size: 0.025,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(cloudPoints);

      // Grid
      const gridHelper = new THREE.GridHelper(12, 24, 8956671, 3364232);
      gridHelper.position.y = -1.8;
      (gridHelper.material as { transparent: boolean; opacity: number }).transparent = true;
      (gridHelper.material as { transparent: boolean; opacity: number }).opacity = 0.2;
      scene.add(gridHelper);

      // Texto 3D: nombre + título
      let textGroup: {
        position: { y: number };
        rotation: { y: number };
      } | null = null;
      const TEXT_Y = 1.7;
      new FontLoader().load(
        "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/droid/droid_sans_bold.typeface.json",
        (font: unknown) => {
          if (disposed) return;
          const mkLine = (txt: string, size: number, mat: unknown) => {
            const g = new TextGeometry(txt, {
              font,
              size,
              depth: 0.1,
              height: 0.1,
              curveSegments: 8,
              bevelEnabled: true,
              bevelThickness: 0.014,
              bevelSize: 0.011,
              bevelSegments: 3,
            });
            g.computeBoundingBox();
            g.translate(-0.5 * (g.boundingBox.max.x + g.boundingBox.min.x), 0, 0);
            return new THREE.Mesh(g, mat);
          };
          const matName = new THREE.MeshStandardMaterial({
            color: 0xffd86e,
            emissive: 0xffa517,
            emissiveIntensity: 0.32,
            roughness: 0.22,
            metalness: 0.95,
          });
          const matSub = new THREE.MeshStandardMaterial({
            color: 0xdcefff,
            emissive: 0x2a6fff,
            emissiveIntensity: 0.42,
            roughness: 0.3,
            metalness: 0.8,
          });
          const lineName = mkLine("Cristian Hernández", 0.27, matName);
          const lineSub = mkLine("Arquitecto de Software - Empresario", 0.14, matSub);
          lineName.position.y = 0.23;
          lineSub.position.y = -0.19;
          const grp = new THREE.Group();
          grp.add(lineName, lineSub);
          grp.position.set(0, TEXT_Y, 0);
          scene.add(grp);
          textGroup = grp;
        },
        undefined,
        (err: unknown) => console.error("Hero3D font:", err),
      );

      let time = 0;
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        time += 0.012;
        coreMesh.rotation.y = 0.25 * time;
        coreMesh.rotation.x = 0.2 * Math.sin(0.37 * time);
        coreMesh.rotation.z = 0.15 * Math.cos(0.23 * time);
        wireframeIco.rotation.copy(coreMesh.rotation);
        ringParticles.rotation.y = 0.35 * time;
        ringParticles.rotation.x = 0.2 * Math.sin(0.28 * time);
        torusRing.rotation.x = Math.PI / 2;
        torusRing.rotation.z = 0.5 * time;
        torusRing2.rotation.x = Math.PI / 2 + 0.3;
        torusRing2.rotation.z = 0.65 * time;
        const e = (0.2 * time) % (2 * Math.PI);
        colorLight.color.setHSL(0.55 + 0.1 * Math.sin(e), 1, 0.6);
        stars.rotation.y += 5e-4;
        stars.rotation.x += 3e-4;
        cloudPoints.rotation.y = 0.05 * time;
        cloudPoints.rotation.x = 0.1 * Math.sin(0.1 * time);
        const tgrp = textGroup;
        if (tgrp) {
          tgrp.position.y = TEXT_Y + 0.06 * Math.sin(0.8 * time);
          tgrp.rotation.y = Math.atan2(camera.position.x, camera.position.z);
        }
        controls.update();
        composer.render();
      };
      animate();

      const onResize = () => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
        composer.setSize(W(), H());
        frame();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        window.removeEventListener("resize", onResize);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })().catch((err) => console.error("Hero3D init:", err));

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cleanup();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} className="hero3d-canvas" aria-hidden="true" />
      {/* Pista de scroll (no bloquea el arrastre del 3D) */}
      <div className="hero3d-cue" aria-hidden="true">
        <span>arrastra para rotar</span>
        <span className="hero3d-cue-arrow">↓</span>
      </div>
      <style>{`
        .hero3d-canvas { position: absolute; inset: 0; z-index: 0; }
        .hero3d-canvas canvas { display: block; width: 100% !important; height: 100% !important; }
        .hero3d-cue {
          position: absolute;
          left: 0; right: 0; bottom: clamp(20px, 4vh, 40px);
          z-index: 1;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          pointer-events: none;
          color: rgba(255,255,255,0.55);
          font-family: var(--font-mono, monospace);
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
        }
        .hero3d-cue-arrow { font-size: 16px; animation: hero3d-bounce 1.8s ease-in-out infinite; }
        @keyframes hero3d-bounce { 0%,100% { transform: translateY(0); opacity: .6; } 50% { transform: translateY(6px); opacity: 1; } }
      `}</style>
    </>
  );
}
