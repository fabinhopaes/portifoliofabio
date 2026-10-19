/* CENA 3D - ORBE CROMADO */
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loader-bar");
const loaderPercent = document.getElementById("loader-percent");
let loaderProgress = 0;

if (loader) {
  const loading = setInterval(() => {
    loaderProgress = Math.min(loaderProgress + 5, 100);

    if (loaderBar) loaderBar.style.width = loaderProgress + "%";
    if (loaderPercent) loaderPercent.textContent = loaderProgress + "%";

    if (loaderProgress === 100) {
      clearInterval(loading);
      loader.classList.add("done");
    }
  }, 50);
}

const cursorGlow = document.querySelector(".cursor-glow");

if (cursorGlow) {
  document.addEventListener("pointermove", (event) => {
    cursorGlow.style.setProperty("--mouse-x", event.clientX + "px");
    cursorGlow.style.setProperty("--mouse-y", event.clientY + "px");
    cursorGlow.classList.add("visible");
  });

  document.addEventListener("pointerleave", () => {
    cursorGlow.classList.remove("visible");
  });
}

const canvas = document.getElementById("three-scene");

if (canvas && typeof THREE !== "undefined") {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 7.5;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  /* Reflexos de estúdio gerados localmente para o material cromado. */
  function criarAmbiente() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, "#101d3b");
    grad.addColorStop(0.28, "#dce8ff");
    grad.addColorStop(0.48, "#496ba9");
    grad.addColorStop(0.68, "#101a35");
    grad.addColorStop(0.82, "#7899d5");
    grad.addColorStop(1, "#080f22");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);

    const softboxes = [
      { x: 110, y: 78, w: 96, h: 230, color: "#ffffff" },
      { x: 390, y: 32, w: 150, h: 145, color: "#f4f7ff" },
      { x: 720, y: 126, w: 88, h: 240, color: "#76a7ff" },
      { x: 920, y: 55, w: 48, h: 190, color: "#ffffff" }
    ];

    softboxes.forEach(({ x, y, w, h, color }) => {
      const glow = g.createLinearGradient(x, y, x + w, y + h);
      glow.addColorStop(0, "rgba(255,255,255,0)");
      glow.addColorStop(0.5, color);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = glow;
      g.fillRect(x, y, w, h);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    return env;
  }

  scene.environment = criarAmbiente();


  const luzPrincipal = new THREE.DirectionalLight(0xffffff, 1.7);
  luzPrincipal.position.set(3, 4, 5);
  scene.add(luzPrincipal);
  const luzAzul = new THREE.DirectionalLight(0x477dff, 2.2);
  luzAzul.position.set(-4, 1, 4);
  scene.add(luzAzul);
  scene.add(new THREE.AmbientLight(0xa8c5ff, 0.35));

  const cromo = new THREE.MeshPhysicalMaterial({
    color: 0x829ac5,
    metalness: 0.88,
    roughness: 0.12,
    envMapIntensity: 1.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12
  });

  const object = new THREE.Group();
  scene.add(object);

  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 128, 128),
    cromo
  );
  object.add(esfera);

  const satelites = [
    { forma: "cristal", raio: 0.2, distancia: 1.92, angulo: 0.5, altura: 0.65, revelar: 0.14, cor: 0xd9e6ff },
    { forma: "diamante", raio: 0.16, distancia: 2.08, angulo: 2.6, altura: -0.5, revelar: 0.4, cor: 0x79a7ff },
    { forma: "faceta", raio: 0.19, distancia: 1.98, angulo: 4.5, altura: 0.35, revelar: 0.68, cor: 0xa8c4ff }
  ].map((config) => {
    const geometrias = {
      cristal: new THREE.IcosahedronGeometry(config.raio, 0),
      diamante: new THREE.OctahedronGeometry(config.raio, 0),
      faceta: new THREE.DodecahedronGeometry(config.raio, 0)
    };
    const materialSatelite = cromo.clone();
    materialSatelite.color.setHex(config.cor);
    materialSatelite.roughness = 0.2;
    materialSatelite.flatShading = true;
    materialSatelite.needsUpdate = true;

    const satelite = new THREE.Mesh(geometrias[config.forma], materialSatelite);
    satelite.visible = false;
    object.add(satelite);
    return { ...config, mesh: satelite };
  });

  object.rotation.set(0.28, -0.42, -0.18);

  const alvo = { x: 0, y: 0 };
  document.addEventListener("mousemove", (event) => {
    alvo.x = (event.clientY / window.innerHeight - 0.5) * 0.3;
    alvo.y = (event.clientX / window.innerWidth - 0.5) * 0.4;
  });

  const suave = { x: 0, y: 0 };
  let alvoScroll = window.scrollY;
  let scrollSuave = alvoScroll;
  window.addEventListener("scroll", () => {
    alvoScroll = window.scrollY;
  }, { passive: true });

  const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inicioAnimacao = performance.now();

  function animate3D() {
    requestAnimationFrame(animate3D);

    const tempo = (performance.now() - inicioAnimacao) * 0.001;
    if (!movimentoReduzido) {
      suave.x += (alvo.x - suave.x) * 0.04;
      suave.y += (alvo.y - suave.y) * 0.04;
    }
    scrollSuave += (alvoScroll - scrollSuave) * 0.08;

    object.rotation.x = 0.28 + (movimentoReduzido ? 0 : Math.sin(tempo * 0.8) * 0.045 + suave.x);
    object.rotation.y = -0.42 + (movimentoReduzido ? 0 : suave.y);
    object.rotation.z = -0.18 + (movimentoReduzido ? 0 : Math.sin(tempo * 0.6) * 0.025);
    esfera.rotation.y = tempo * 0.12 + scrollSuave * 0.00065 + suave.y * 1.8;
    esfera.rotation.x = (movimentoReduzido ? 0 : Math.sin(tempo * 0.35) * 0.08) + suave.x * 1.5;
    object.position.y = movimentoReduzido ? 0 : Math.sin(tempo * 1.4) * 0.07;
    const scrollProgress = Math.min(scrollSuave / Math.max(window.innerHeight * 0.9, 1), 1);
    satelites.forEach((satelite, index) => {
      const reveal = THREE.MathUtils.clamp(
        (scrollProgress - satelite.revelar) / 0.16,
        0,
        1
      );
      const suavizarEntrada = reveal * reveal * (3 - 2 * reveal);
      satelite.mesh.visible = suavizarEntrada > 0.01;
      satelite.mesh.scale.setScalar(suavizarEntrada);
      const angulo = satelite.angulo + tempo * (0.08 + index * 0.025);
      satelite.mesh.position.set(
        Math.cos(angulo) * satelite.distancia,
        Math.sin(angulo) * satelite.distancia * 0.48 + satelite.altura,
        Math.sin(angulo) * 0.75
      );
      satelite.mesh.rotation.y = tempo * 0.18;
      satelite.mesh.rotation.x = tempo * 0.12 + index * 0.7;
    });
    if (!movimentoReduzido) {
      luzPrincipal.position.set(
        3 + Math.sin(tempo) * 1.5,
        4 + Math.cos(tempo * 0.8),
        5
      );
    }

    const mobile = window.innerWidth < 800;
    object.scale.setScalar(mobile ? 0.28 : 0.76);
    object.position.x = mobile ? 0.3 : 1.95;
    if (mobile) object.position.y += 1.45;

    renderer.render(scene, camera);
  }

  animate3D();

  /* REDIMENSIONAMENTO */
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

if (typeof gsap !== "undefined") {
  if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  gsap.utils.toArray(".reveal").forEach((element) => {
    const animation = {
      y: 0,
      opacity: 1,
      duration: 1
    };

    if (typeof ScrollTrigger !== "undefined") {
      animation.scrollTrigger = {
        trigger: element,
        start: "top 85%",
        toggleActions: "play none none reverse"
      };
    }

    gsap.fromTo(element, { y: 40, opacity: 0 }, animation);
  });
} else {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.style.opacity = "1";
    element.style.transform = "none";
  });
}