import { ACESFilmicToneMapping, Color, DirectionalLight, Fog, HemisphereLight, PCFShadowMap, PMREMGenerator, Scene, SRGBColorSpace, WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PALETTE } from "./materials";
import { sceneOptionsFor, type SceneOptions } from "./sceneData";

export function setupRenderer(canvas: HTMLCanvasElement, scene: Scene, sun: DirectionalLight, options: SceneOptions) {
  const settings = sceneOptionsFor(options);
  const renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: "default" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.pixelRatioCap));

  // Filmic tone mapping + a generated environment give PBR surfaces natural highlights and bounce.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = settings.exposure;
  scene.background = new Color(PALETTE.skyHorizon);
  scene.fog = new Fog(PALETTE.skyHorizon, settings.fogNear, settings.fogFar);
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const sky = new HemisphereLight("#FFF1EC", "#6E8F4E", 0.55);
  sun.position.set(-4, 9, -5);
  scene.add(sky, sun, sun.target);
  if (!options.lowPower) {
    // Soft sun shadows that follow the couple (a small shadow box keeps the map sharp on phones).
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
  }

  return { renderer, environment };
}
