import * as THREE from 'three'
import GUI from 'lil-gui'
import gsap from 'gsap'

import { BBQInterface } from '@/constants/DIFFICULTY_DATA'

import { getFrame } from '@/class/three/utils/Maths'

import ORDALIES from '@/constants/ORDALIES'
import SOUNDS from '@/constants/SOUNDS'

import setHTMLPosition from '@/class/three/utils/setHTMLPosition'
import OrdalieManager from '@/class/three/World/Ordalie/OrdalieManager'
import Ordalie from '@/class/three/World/Ordalie/Ordalie'
import WebGL from '@/class/three/WebGL'

import fragmentShader from '@/class/three/shaders/burning/fragment.glsl'
import vertexShader from '@/class/three/shaders/burning/vertex.glsl'
import AudioManager from '../../utils/AudioManager'
import ANIMATIONS from '~~/constants/ANIMATIONS'

// import characterBurningFrag from '@/class/three/shaders/characterBurning/fragment.glsl'
// import characterBurningVert from '@/class/three/shaders/characterBurning/vertex.glsl'

class OrdalieBBQ {
  instance: Ordalie
  character: THREE.Mesh
  characterPosEntreeEnd = new THREE.Vector3(0)
  characterPosSortieStart = new THREE.Vector3(0)
  texts: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial | THREE.ShaderMaterial>[]
  container: HTMLDivElement[]
  // Gameplay
  animation: {
    mixer: THREE.AnimationMixer
    actions: {
      [key: string]: {
        action: THREE.AnimationAction
        frames: {
          frame: number
          sound: string
        }[]
      }
    }
    play: (name: string) => void
  }
  forwardSpeed = 0.11
  modulo = 0
  uniforms: {
    uNoise: { value: THREE.Texture }
    uGradient: { value: THREE.Texture }
    uTexture: { value: THREE.Texture }
  }
  isGameWon = false
  difficultyData: BBQInterface

  debugFolder: GUI

  constructor(_ordalie: Ordalie) {
    this.instance = _ordalie
    this.difficultyData = this.instance.block.getDifficultyData() as BBQInterface
    this.texts = []
    this.container = []
    // this.animation =

    this.instance.block.getModel().scene.traverse((mesh) => {
      // console.log(mesh)

      if (mesh.name.startsWith('text')) {
        this.texts.push(mesh)
      }
    })

    if (WebGL.debug.isActive()) this.debugFolder = WebGL.debug.addFolder('OrdalieBBQ')

    this.setCharacter()
    this.setAnimation()
    this.setTexts()
  }

  setContainer(container: HTMLDivElement, i: number) {
    this.container[i] = container
  }

  start() {
    window.addEventListener('resize', this.onResize)
    this.animation.play(ANIMATIONS.BBQ.ENTREE)
  }

  end() {
    window.removeEventListener('resize', this.onResize)
    if (this.debugFolder) this.debugFolder.destroy()
    this.instance.end()
  }

  private onResize = () => {
    for (let i = 0; i < this.container.length; i++) {
      this.updateHTML(i)
    }
  }

  updateHTML(i: number) {
    const positions = setHTMLPosition(this.texts[i])
    this.container[i].style.transform = `translate(${positions.topLeft.x}px,${positions.topLeft.y}px)`
    this.container[i].style.width = positions.width + 'px'
    this.container[i].style.height = positions.height + 'px'
    this.container[i].style.fontSize = positions.width / 11.28 + 'px'

    //11.28 vient de 282/25 parce que le container fait 282px la bonne taille est de 25 px
  }

  private setTexts() {
    const texture = 'map' in this.texts[0].material ? this.texts[0].material.map : null
    const noise = WebGL.resources.getItems(this.instance.block.getType(), 'noise')
    const gradient = WebGL.resources.getItems('COMMON', 'gradient')

    this.uniforms = {
      uNoise: { value: noise },
      uGradient: { value: gradient },
      uTexture: { value: texture },
    }

    for (let i = 0; i < this.texts.length; i++) {
      this.texts[i].material = new THREE.ShaderMaterial({
        uniforms: { ...this.uniforms, uDissolve: { value: 0 } },
        fragmentShader: fragmentShader,
        vertexShader: vertexShader,
        transparent: true,
      })
    }
  }

  private setCharacter() {
    const rig = this.instance.block.getModel().scene.children.find((child) => child.name === 'RIG_Cuisinier') as THREE.Mesh
    this.character = rig.children.find((child) => child.name === 'MAIN_SIDE_ROOT') as THREE.Mesh
  }

  private setAnimation() {
    const mixer = new THREE.AnimationMixer(this.instance.block.getModel().scene)

    this.animation = {
      mixer,
      actions: {
        [ANIMATIONS.BBQ.AVANCE]: {
          action: mixer.clipAction(this.instance.block.getModel().animations[0]),
          frames: SOUNDS[ORDALIES.BBQ][ANIMATIONS.BBQ.AVANCE].frames,
        },
        [ANIMATIONS.BBQ.ENTREE]: {
          action: mixer.clipAction(this.instance.block.getModel().animations[1]),
          frames: SOUNDS[ORDALIES.BBQ][ANIMATIONS.BBQ.ENTREE].frames,
        },
        [ANIMATIONS.BBQ.IDLE]: {
          action: mixer.clipAction(this.instance.block.getModel().animations[2]),
          frames: SOUNDS[ORDALIES.BBQ][ANIMATIONS.BBQ.IDLE].frames,
        },
        [ANIMATIONS.BBQ.MORT]: {
          action: mixer.clipAction(this.instance.block.getModel().animations[3]),
          frames: SOUNDS[ORDALIES.BBQ][ANIMATIONS.BBQ.MORT].frames,
        },
        [ANIMATIONS.BBQ.SORTIE]: {
          action: mixer.clipAction(this.instance.block.getModel().animations[4]),
          frames: SOUNDS[ORDALIES.BBQ][ANIMATIONS.BBQ.SORTIE].frames,
        },
      },
      play: (name: string) => {
        this.animation.actions[name].action.play()
      },
    }

    this.animation.actions[ANIMATIONS.BBQ.AVANCE].action.clampWhenFinished = true
    this.animation.actions[ANIMATIONS.BBQ.AVANCE].action.loop = THREE.LoopOnce

    this.animation.actions[ANIMATIONS.BBQ.ENTREE].action.clampWhenFinished = true
    this.animation.actions[ANIMATIONS.BBQ.ENTREE].action.loop = THREE.LoopOnce

    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.timeScale = 1.2
    // this.animation.actions[ANIMATIONS.BBQ.IDLE].clampWhenFinished = true
    // this.animation.actions[ANIMATIONS.BBQ.IDLE].loop = THREE.LoopOnce
    this.animation.actions[ANIMATIONS.BBQ.MORT].action.clampWhenFinished = true
    this.animation.actions[ANIMATIONS.BBQ.MORT].action.loop = THREE.LoopOnce

    this.animation.actions[ANIMATIONS.BBQ.SORTIE].action.clampWhenFinished = true
    this.animation.actions[ANIMATIONS.BBQ.SORTIE].action.loop = THREE.LoopOnce

    this.animation.mixer.addEventListener('finished', (e) => {
      if (e.action._clip.name === ANIMATIONS.BBQ.ENTREE) {
        this.characterPosEntreeEnd.set(this.character.position.x, this.character.position.y, this.character.position.z)
        this.animation.actions[ANIMATIONS.BBQ.ENTREE].action.stop()
        this.character.position.set(this.characterPosEntreeEnd.x, this.characterPosEntreeEnd.y, this.characterPosEntreeEnd.z)
        this.animation.actions[ANIMATIONS.BBQ.IDLE].action.play()
      }

      if (e.action._clip.name === ANIMATIONS.BBQ.AVANCE) {
        this.animation.actions[ANIMATIONS.BBQ.AVANCE].action.stop()
        this.animation.actions[ANIMATIONS.BBQ.IDLE].action.reset()
        this.animation.play(ANIMATIONS.BBQ.IDLE)
      }

      if (e.action._clip.name === ANIMATIONS.BBQ.MORT || e.action._clip.name === ANIMATIONS.BBQ.SORTIE) {
        this.end()
      }
    })

    // Debug
    // if (WebGL.debug.isActive()) {
    //   this.debugFolder.add(this.debugParams().animations, 'playCharacterEnter')
    // }
  }

  makeAStep() {
    if (this.isGameWon) return

    this.animation.actions[ANIMATIONS.BBQ.AVANCE].action.stop()
    this.animation.play(ANIMATIONS.BBQ.AVANCE)

    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.crossFadeTo(this.animation.actions[ANIMATIONS.BBQ.AVANCE].action, 0.16, false)

    gsap.to(this.character.position, {
      x: this.character.position.x + this.forwardSpeed,
      duration: 1,
    })
  }

  gameWon() {
    this.isGameWon = true

    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.stop()
    this.characterPosSortieStart.set(this.character.position.x, this.character.position.y, this.character.position.z)
    this.animation.play(ANIMATIONS.BBQ.SORTIE)
    this.character.position.set(this.characterPosSortieStart.x, this.characterPosSortieStart.y, this.characterPosSortieStart.z)

    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.crossFadeTo(this.animation.actions[ANIMATIONS.BBQ.SORTIE].action, 0.16, false)
  }

  gameOver() {
    OrdalieManager.setIsDead(true)
    // this.animation.actions[ANIMATIONS.BBQ.ENTREE].fadeOut(0)
    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.stop()
    this.animation.play(ANIMATIONS.BBQ.MORT)
    this.animation.actions[ANIMATIONS.BBQ.IDLE].action.crossFadeTo(this.animation.actions[ANIMATIONS.BBQ.MORT].action, 0.16, false)

    for (let i = 0; i < this.texts.length; i++) {
      const material = this.texts[i].material as THREE.ShaderMaterial
      gsap.to(material.uniforms.uDissolve, {
        value: 1,
        duration: 1,
      })
    }
  }

  update() {
    const { deltaTime } = WebGL.time
    this.animation.mixer.update(deltaTime * 0.001)

    for (const animation of Object.values(this.animation.actions)) {
      const time = animation.action.time
      const currentFrame = Math.round(getFrame(time))

      for (let j = 0; j < animation.frames.length; j++) {
        if (animation.frames[j].frame === currentFrame) {
          AudioManager.play(animation.frames[j].sound)
        }
      }
    }
  }
}

export default OrdalieBBQ
