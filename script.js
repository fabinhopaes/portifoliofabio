/* CENA 3D - ESFERA CROMADA DIVIDIDA */
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

const canvas = document.getElementById("three-scene");

if (canvas && typeof THREE !== "undefined") {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    40,
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
  renderer.toneMappingExposure = 1.15;


  /* AMBIENTE DE REFLEXO (gerado por código, sem imagens externas) */
  function criarAmbiente() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");

    // degradê base: céu claro -> azul -> escuro
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, "#ffffff");
    grad.addColorStop(0.3, "#cfe0ff");
    grad.addColorStop(0.5, "#6f95e0");
    grad.addColorStop(0.75, "#1b2a4d");
    grad.addColorStop(1.0, "#05080f");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);

    // manchas escuras (sombras amarronzadas do cromo)
    const escuras = [
      [120, 220, 150, 120, "#2a2220"],
      [420, 260, 200, 90, "#1a1a24"],
      [700, 200, 130, 140, "#3a2f2a"],
      [880, 300, 120, 80, "#10121a"],
      [260, 360, 180, 70, "#141824"]
    ];
    escuras.forEach(([x, y, w, h, cor]) => {
      g.fillStyle = cor;
      g.beginPath();
      g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      g.fill();
    });

    // softboxes brancos (brilhos fortes)
    const claras = [
      [200, 90, 140, 40],
      [600, 70, 180, 35],
      [850, 130, 100, 50],
      [40, 150, 80, 60]
    ];
    claras.forEach(([x, y, w, h]) => {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      g.fill();
    });

    // toques de azul vivo
    g.fillStyle = "#3d7bff";
    g.beginPath();
    g.ellipse(520, 190, 160, 55, 0, 0, Math.PI * 2);
    g.fill();

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


  /* LUZES DE APOIO */
  const luzPrincipal = new THREE.DirectionalLight(0xffffff, 2.2);
  luzPrincipal.position.set(3, 5, 5);
  scene.add(luzPrincipal);

  const luzAzul = new THREE.DirectionalLight(0x4f86ff, 1.6);
  luzAzul.position.set(-5, -2, 3);
  scene.add(luzAzul);

  scene.add(new THREE.AmbientLight(0x8fa6d6, 0.4));


  /* MATERIAL CROMADO AZUL-PRATA */
  const cromo = new THREE.MeshPhysicalMaterial({
    color: 0xc4d4ee,
    metalness: 1,
    roughness: 0.07,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide
  });

  const cromoRebordo = new THREE.MeshPhysicalMaterial({
    color: 0xe6eeff,
    metalness: 1,
    roughness: 0.04,
    envMapIntensity: 1.8,
    clearcoat: 1
  });


  /* GRUPO PRINCIPAL */
  const object = new THREE.Group();
  scene.add(object);

  const R = 1.6;
  const SEG = 128;

  function meiaEsfera(raio, superior) {
    return new THREE.SphereGeometry(
      raio, SEG, SEG,
      0, Math.PI * 2,
      superior ? 0 : Math.PI / 2,
      Math.PI / 2
    );
  }

  function rebordo(raio, espessura) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(raio, espessura, 32, 220),
      cromoRebordo
    );
    t.rotation.x = Math.PI / 2;
    return t;
  }


  /* TIGELA INFERIOR */
  const tigela = new THREE.Group();
  tigela.add(new THREE.Mesh(meiaEsfera(R, false), cromo));
  tigela.add(rebordo(R, 0.045));
  object.add(tigela);


  /* CUPULA INTERNA (menor, dentro da tigela) */
  const cupulaInterna = new THREE.Mesh(meiaEsfera(R * 0.86, true), cromo);
  cupulaInterna.position.y = -0.05;
  object.add(cupulaInterna);


  /* META DE CIMA (deslocada e inclinada, criando a fresta) */
  const tampa = new THREE.Group();
  tampa.add(new THREE.Mesh(meiaEsfera(R * 0.98, true), cromo));
  tampa.add(rebordo(R * 0.98, 0.05));
  tampa.position.set(0.05, 0.14, 0.02);
  tampa.rotation.set(-0.12, 0, -0.16);
  object.add(tampa);


  /* INCLINACAO BASE (mostra o interior como na referencia) */
  const baseRot = { x: 0.62, y: -0.35, z: -0.28 };
  object.rotation.set(baseRot.x, baseRot.y, baseRot.z);


  /* INTERACAO COM O MOUSE */
  const alvo = { x: 0, y: 0 };

  document.addEventListener("mousemove", (event) => {
    alvo.x = (event.clientY / window.innerHeight - 0.5) * 0.3;
    alvo.y = (event.clientX / window.innerWidth - 0.5) * 0.4;
  });

  let suave = { x: 0, y: 0 };


  /* ANIMACAO */
  function animate3D() {
    requestAnimationFrame(animate3D);

    const tempo = Date.now() * 0.0006;

    suave.x += (alvo.x - suave.x) * 0.05;
    suave.y += (alvo.y - suave.y) * 0.05;

    object.rotation.x = baseRot.x + Math.sin(tempo * 0.8) * 0.08 + suave.x;
    object.rotation.y = baseRot.y + Math.sin(tempo) * 0.15 + suave.y;
    object.rotation.z = baseRot.z + Math.sin(tempo * 0.6) * 0.05;

    object.position.y = Math.sin(tempo * 1.5) * 0.1;

    // a tampa "respira" levemente, abrindo e fechando a fresta
    tampa.position.y = 0.14 + Math.sin(tempo * 1.2) * 0.03;
    tampa.rotation.z = -0.16 + Math.sin(tempo * 0.9) * 0.03;

    object.scale.setScalar(window.innerWidth < 800 ? 0.8 : 1.1);
    object.position.x = window.innerWidth < 800 ? 0.6 : 1.9;

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