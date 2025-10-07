import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './components/Icons'
import ModernButton from './components/ModernButton'
import AnimatedStats from './components/AnimatedStats'
import EnhancedStats from './components/EnhancedStats'
import LoadingSpinner from './components/LoadingSpinner'
import ImageGrid from './components/ImageGrid'
import AnimatedBackground from './components/AnimatedBackground'
import TemplateManager from './components/TemplateManager'
import MobileSync from './components/MobileSync'
import LazyModal from './components/LazyModal'
import { useSpring, animated, useSpringValue, useTrail, config } from '@react-spring/web'
import { useAppStore } from '../private/src/subscription/store'
import { toast } from 'sonner'
import FeatureGate, { PremiumBadge } from './components/FeatureGate'
import FeatureGateFloating, { PremiumBadgeFloating } from './components/FeatureGateFloating'
import FeatureGateCompact, { PremiumBadgeCompact } from './components/FeatureGateCompact'
import FeatureGateSide, { PremiumBadgeSide } from './components/FeatureGateSide'
import CustomSelect from './components/CustomSelect'
import Confetti from 'react-confetti'
import { useWindowSize, useDebounce, useLocalStorage } from 'react-use'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import autoAnimate from '@formkit/auto-animate'
import {
  FaImage,
  FaFolderOpen,
  FaTrash,
  FaPlay,
  FaStop,
  FaEye,
  FaInfoCircle,
  FaFolder,
  FaDownload,
  FaCog,
  FaMagic,
  FaCamera,
  FaMobile,
  FaVideo,
  FaTimes,
  FaCrown,
  FaQrcode
} from 'react-icons/fa'

const cn = (...classes: (string | undefined | null | boolean)[]) => twMerge(clsx(...classes))

function toFileUrl(p: string) {
  let s = p.replace(/\\/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  return encodeURI('file://' + s)
}

type ProfileKind = 'camera'|'phone'|'action'|'drone'|'scanner'|'webcam'|'film'|'security'|'gaming'|'automotive'|'medical'|'astro'|'satellite'|'cinema'|'microscope'|'surveillance'|'broadcast'

interface CustomTemplate {
  id: string
  name: string
  icon?: string
  general?: {
    fakeAuto?: boolean
    fakePerFile?: boolean
    onlineAuto?: boolean
  }
  location?: {
    enabled?: boolean
    lat?: string
    lon?: string
    altitude?: string
    city?: string
    state?: string
    country?: string
  }
  metadata?: {
    author?: string
    description?: string
    keywords?: string
    copyright?: string
    creatorTool?: string
    title?: string
    label?: string
    rating?: number | ''
    colorSpace?: string
  }
  camera?: {
    profile?: ProfileKind
    make?: string
    model?: string
    lens?: string
    software?: string
    serial?: string
    iso?: number | ''
    exposureTime?: string
    fNumber?: number | ''
    focalLength?: number | ''
    exposureProgram?: number | ''
    meteringMode?: number | ''
    flash?: number | ''
    whiteBalance?: number | ''
  }
}

const GEAR_PRESETS: Record<ProfileKind, any> = {
  camera: {
    makes: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'Olympus', 'Pentax', 'Leica', 'Hasselblad', 'Phase One', 'Sigma', 'Blackmagic'],
    modelsByMake: {
      Canon: ['EOS R5', 'EOS R6 Mark II', 'EOS R8', 'EOS R10', 'EOS 5D Mark IV', 'EOS 90D', 'EOS M50 Mark II', 'EOS 6D Mark II', 'EOS 80D', 'EOS Rebel T8i'],
      Nikon: ['Z9', 'Z8', 'Z7 II', 'Z6 III', 'Z5', 'Z50', 'Zfc', 'D850', 'D780', 'D7500', 'D5600'],
      Sony: ['Alpha A7R V', 'Alpha A7 IV', 'Alpha A7S III', 'Alpha A1', 'Alpha A7C II', 'Alpha A6700', 'Alpha A6400', 'Alpha FX30', 'Alpha A7R III', 'Alpha A6000'],
      Fujifilm: ['X‑T5', 'X‑H2S', 'X‑H2', 'X‑S20', 'X‑T30 II', 'X100V', 'X100VI', 'GFX 100S', 'GFX 50S II', 'X‑E4'],
      Panasonic: ['Lumix S5 II', 'Lumix S5 IIX', 'Lumix GH6', 'Lumix GH7', 'Lumix G9 II', 'Lumix S1R', 'Lumix G95', 'Lumix FZ2500'],
      Olympus: ['OM-1', 'OM-5', 'E-M1 Mark III', 'E-M5 Mark III', 'E-M10 Mark IV', 'PEN E-P7', 'Tough TG-7'],
      Pentax: ['K-3 Mark III', 'K-1 Mark II', 'KF', 'K-70', 'Q-S1', 'WG-90'],
      Leica: ['M11', 'M10-R', 'Q2', 'Q2 Monochrom', 'SL2-S', 'C-Lux', 'D-Lux 7'],
      Hasselblad: ['X2D 100C', 'X1D II 50C', '907X 50C', 'H6D-100c', 'A7D'],
      'Phase One': ['IQ4 150MP', 'XF IQ4 100MP', 'XT IQ4 150MP'],
      Sigma: ['fp L', 'fp', 'sd Quattro H'],
      Blackmagic: ['Pocket 6K Pro', 'Pocket 4K', 'URSA Mini Pro 12K']
    },
    lensesByMake: {
      Canon: ['RF 24‑70mm f/2.8L IS USM', 'RF 50mm f/1.2L USM', 'RF 85mm f/1.2L USM', 'RF 70‑200mm f/2.8L IS USM', 'RF 35mm f/1.8 IS STM', 'EF 50mm f/1.8 STM', 'RF 100mm f/2.8L Macro IS USM', 'RF 16-35mm f/2.8L IS USM'],
      Nikon: ['Z 24‑70mm f/2.8 S', 'Z 50mm f/1.2 S', 'Z 85mm f/1.2 S', 'Z 70‑200mm f/2.8 VR S', 'Z 35mm f/1.8 S', 'AF‑S 50mm f/1.8G', 'Z 105mm f/2.8 Macro VR S', 'Z 14-24mm f/2.8 S'],
      Sony: ['FE 24‑70mm f/2.8 GM II', 'FE 50mm f/1.2 GM', 'FE 85mm f/1.4 GM', 'FE 70‑200mm f/2.8 GM OSS', 'FE 35mm f/1.8', 'FE 50mm f/1.8', 'FE 90mm f/2.8 Macro G OSS', 'FE 16-35mm f/2.8 GM'],
      Fujifilm: ['XF 23mm f/1.4 R LM WR', 'XF 50mm f/1.0 R WR', 'XF 56mm f/1.2 R WR', 'XF 70‑300mm f/4‑5.6 R LM OIS WR', 'XF 35mm f/1.4 R', 'XF 18‑55mm f/2.8‑4 R LM OIS', 'XF 80mm f/2.8 R LM OIS WR Macro'],
      Panasonic: ['LUMIX S 24‑105mm f/4 Macro O.I.S.', 'LUMIX S 50mm f/1.8', 'LUMIX S 85mm f/1.8', 'LUMIX S 70‑200mm f/2.8 O.I.S.', 'LEICA DG 12‑60mm f/2.8‑4', 'LUMIX G 25mm f/1.7 ASPH.'],
      Olympus: ['M.Zuiko 12-40mm f/2.8 PRO', 'M.Zuiko 25mm f/1.2 PRO', 'M.Zuiko 45mm f/1.2 PRO', 'M.Zuiko 40-150mm f/2.8 PRO', 'M.Zuiko 17mm f/1.8', 'M.Zuiko 75mm f/1.8'],
      Pentax: ['HD PENTAX-D FA 24-70mm f/2.8ED SDM WR', 'HD PENTAX-FA 50mm f/1.4 SDM AW', 'HD PENTAX-D FA 85mm f/1.4ED SDM AW', 'HD PENTAX-D FA 70-200mm f/2.8ED DC AW'],
      Leica: ['APO-Summicron-M 50mm f/2 ASPH.', 'Summilux-M 35mm f/1.4 ASPH.', 'APO-Summicron-SL 75mm f/2 ASPH.', 'Vario-Elmarit-SL 24-70mm f/2.8 ASPH.'],
      Hasselblad: ['XCD 45mm f/4 P', 'XCD 80mm f/1.9', 'XCD 90mm f/3.2', 'XCD 35-75mm f/3.5-4.5'],
      'Phase One': ['Schneider 80mm f/2.8 LS', 'Schneider 110mm f/2.8 LS', 'Rodenstock 32mm f/4'],
      Sigma: ['24-70mm f/2.8 DG DN Art', '85mm f/1.4 DG DN Art', '14-24mm f/2.8 DG DN Art'],
      Blackmagic: ['MFT Mount', 'EF Mount', 'PL Mount']
    }
  },
  phone: {
    makes: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei', 'OnePlus', 'Oppo', 'Vivo', 'Nothing', 'Honor'],
    modelsByMake: {
      Apple: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro', 'iPhone 13', 'iPhone SE (3rd gen)'],
      Samsung: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23 FE', 'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy A55', 'Galaxy A35', 'Galaxy Note 20 Ultra'],
      Xiaomi: ['Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 13T Pro', 'Xiaomi 13 Pro', 'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi K70 Pro', 'POCO F6 Pro', 'Mi 13', 'Mi 12S Ultra'],
      Google: ['Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 8a', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 6a'],
      Huawei: ['Pura 70 Ultra', 'Pura 70 Pro', 'Mate 60 Pro+', 'P60 Pro', 'Mate 50 Pro', 'P50 Pro', 'nova 12 Ultra'],
      OnePlus: ['OnePlus 12', 'OnePlus 12R', 'OnePlus 11', 'OnePlus 10T', 'OnePlus Nord 4', 'OnePlus Open'],
      Oppo: ['Find X7 Ultra', 'Find X6 Pro', 'Reno 12 Pro', 'Find N3', 'A79'],
      Vivo: ['X100 Pro', 'X90 Pro+', 'V30 Pro', 'iQOO 12 Pro', 'S18 Pro'],
      Nothing: ['Phone (2a)', 'Phone (2)', 'Phone (1)'],
      Honor: ['Magic6 Pro', 'Magic5 Pro', '200 Pro', '90 Pro', 'X9b']
    },
    lenses: ['Main 24mm f/1.4-2.2', 'UltraWide 13-16mm f/2.0-2.4', 'Telephoto 77-120mm f/1.8-3.5', 'Periscope 200-300mm f/2.8-4.9', 'Macro 25mm f/2.4', 'Action Button Camera', 'ProRAW Max 48MP', 'Cinematic 4K ProRes']
  },
  action: {
    makes: ['GoPro', 'Insta360', 'DJI', 'Sony', 'Garmin', 'AKASO', 'Apeman', 'Yi Technology', 'SJCAM'],
    modelsByMake: {
      GoPro: ['HERO 13 Black', 'HERO 12 Black', 'HERO 11 Black', 'HERO 10 Black', 'HERO 9 Black', 'HERO 8 Black', 'MAX'],
      Insta360: ['X4', 'X3', 'ONE X3', 'GO 3S', 'GO 3', 'ONE RS', 'ONE R', 'Ace Pro'],
      DJI: ['Osmo Action 5 Pro', 'Osmo Action 4', 'Osmo Action 3', 'Osmo Pocket 3', 'Osmo Pocket 2'],
      Sony: ['FX30', 'FDR-X3000', 'HDR-AS300'],
      Garmin: ['VIRB X', 'VIRB XE'],
      AKASO: ['Brave 8', 'Brave 7 LE', 'EK7000 Pro'],
      Apeman: ['A100', 'A87', 'A79 Pro'],
      'Yi Technology': ['4K+', '4K Action', 'Lite'],
      SJCAM: ['SJ11', 'SJ10X', 'C300']
    },
    lenses: ['UltraWide 8-16mm f/2.8', 'Wide 23-27mm f/2.0', 'Linear 27mm f/2.8', 'SuperView', 'HyperSmooth']
  },
  drone: {
    makes: ['DJI', 'Autel', 'Parrot', 'Skydio', 'PowerVision', 'Yuneec', 'Holy Stone', 'Potensic'],
    modelsByMake: {
      DJI: ['Air 3S', 'Mavic 3 Pro', 'Mavic 3 Classic', 'Air 3', 'Mini 4 Pro', 'Mini 3 Pro', 'Mini 3', 'Avata 2', 'Air 2S', 'FPV', 'Inspire 3'],
      Autel: ['EVO Max 4T', 'EVO Nano+', 'EVO Lite+', 'EVO II Pro 6K'],
      Parrot: ['Anafi USA', 'Anafi AI', 'Anafi FPV'],
      Skydio: ['Skydio 2+', 'Skydio X2'],
      PowerVision: ['PowerEgg X', 'PowerDolphin'],
      Yuneec: ['Mantis G', 'Typhoon H520'],
      'Holy Stone': ['HS720G', 'HS175D'],
      Potensic: ['ATOM SE', 'Dreamer Pro']
    },
    lenses: ['Hasselblad 24mm f/2.8-11', 'Hasselblad 70mm f/2.8', 'Hasselblad 166mm f/2.8', 'CMOS 24mm f/1.7', 'Gimbal 22-28mm f/2.8', 'Fixed 85mm f/2.8']
  },
  scanner: {
    makes: ['Epson', 'Canon', 'Plustek', 'Fujitsu', 'Brother', 'HP', 'Kodak', 'Pacific Image'],
    modelsByMake: {
      Epson: ['Perfection V850 Pro', 'Perfection V600', 'Perfection V39', 'Expression 12000XL', 'FastFoto FF-680W'],
      Canon: ['CanoScan 9000F Mark II', 'CanoScan LiDE 400', 'CanoScan LiDE 300', 'imageFORMULA DR-C225W'],
      Plustek: ['OpticFilm 8200i Ai', 'OpticFilm 8100', 'ePhoto Z300+', 'OpticBook 4800'],
      Fujitsu: ['ScanSnap iX1600', 'ScanSnap S1300i', 'fi-8170'],
      Brother: ['ADS-4900W', 'ADS-2700W', 'DSmobile DS-740D'],
      HP: ['ScanJet Pro 4500 fn1', 'ScanJet Pro 2500 f1', 'Smart Tank 7602'],
      Kodak: ['SCANZA', 'RODPFS35', 'i2900'],
      'Pacific Image': ['PrimeFilm XA', 'PrimeFilm XE', 'ImageBox MF']
    },
    lenses: ['CCD Linear Sensor', 'CIS Contact Sensor', 'LED Backlight', 'Xenon Flash', 'Film Adapter']
  },
  webcam: {
    makes: ['Logitech', 'Microsoft', 'Razer', 'Elgato', 'ASUS', 'Creative', 'Anker', 'Opal'],
    modelsByMake: {
      Logitech: ['Brio 4K Stream', 'MX Brio', 'C920s Pro', 'C922 Pro Stream', 'StreamCam', 'C930e', 'C270'],
      Microsoft: ['LifeCam Studio', 'LifeCam HD-3000', 'Modern Webcam'],
      Razer: ['Kiyo Pro Ultra', 'Kiyo Pro', 'Kiyo X', 'Kiyo'],
      Elgato: ['Facecam Pro', 'Facecam', 'Facecam MK.2'],
      ASUS: ['ROG Eye S', 'ROG Eye', 'Webcam C3'],
      Creative: ['Live! Cam Sync 1080p', 'Live! Cam Chat HD'],
      Anker: ['PowerConf C200', 'PowerConf C300'],
      Opal: ['C1', 'Tadpole']
    },
    lenses: ['Fixed 24mm f/2.0', 'Fixed 28mm f/2.4', 'Autofocus 78° FOV', 'Wide 90° FOV', 'Auto HDR']
  },
  film: {
    makes: ['Canon', 'Nikon', 'Pentax', 'Minolta', 'Olympus', 'Leica', 'Contax', 'Mamiya', 'Bronica', 'Rolleiflex'],
    modelsByMake: {
      Canon: ['AE-1 Program', 'A-1', 'EOS-1V', 'F-1', 'AV-1', 'T90', 'EOS 3'],
      Nikon: ['FM2', 'FE2', 'F3', 'F6', 'FM', 'FE', 'F100', 'F5'],
      Pentax: ['K1000', 'ME Super', 'LX', 'MX', '67 II', '645N'],
      Minolta: ['X-700', 'SRT-101', 'XD-11', 'Maxxum 7', 'Autocord'],
      Olympus: ['OM-1', 'OM-2', 'OM-4', 'OM-10', 'Trip 35', 'XA2'],
      Leica: ['M6', 'M3', 'M2', 'R6.2', 'IIIf', 'M4'],
      Contax: ['RTS III', 'G2', 'T2', 'RX', '645'],
      Mamiya: ['RB67', 'RZ67', '645 Pro', 'C330', 'C220'],
      Bronica: ['SQ-A', 'ETRSi', 'GS-1', 'RF645'],
      Rolleiflex: ['2.8F', '3.5F', 'SL66', 'TLR']
    },
    lenses: ['50mm f/1.4', '85mm f/1.8', '35mm f/2.8', '105mm f/2.5', '28mm f/2.8', '135mm f/3.5', '24mm f/2.8', '200mm f/4']
  },
  security: {
    makes: ['Hikvision', 'Dahua', 'Axis', 'Bosch', 'Hanwha', 'Uniview', 'Reolink', 'Arlo', 'Ring', 'Nest'],
    modelsByMake: {
      Hikvision: ['DS-2CD2087G2-LU', 'DS-2CD2386G2-ISU/SL', 'DS-2DE3A400BW-DE', 'DS-2CD2147G2-L', 'DS-2CD2T87G2-L'],
      Dahua: ['IPC-HFW3849T1-AS-PV', 'IPC-HDBW3441R-ZS', 'SD1A404XB-GNR', 'IPC-HDW3849HP-AS-PV', 'DH-IPC-HFW2431S-S-S2'],
      Axis: ['M3058-PLVE', 'P3807-PVE', 'Q6055-E', 'M2026-LE Mk II', 'P1377'],
      Bosch: ['MIC IP fusion 9000i', 'AUTODOME IP starlight 7000i', 'FLEXIDOME IP outdoor 5000i', 'DINION IP 6000 HD'],
      Hanwha: ['PNM-9084RQZ', 'XNO-8080R', 'QNP-6320H', 'ANO-L6012R', 'XND-8081F'],
      Uniview: ['IPC3634SR3-DPF28', 'IPC2125SR3-PF28', 'IPC6415SR-X38U', 'IPC3232ER3-DPZ28'],
      Reolink: ['RLC-823A', 'RLC-811A', 'RLC-510A', 'Argus 3 Pro', 'E1 Zoom'],
      Arlo: ['Ultra 2', 'Pro 4', 'Essential', 'Go 2', 'Video Doorbell'],
      Ring: ['Stick Up Cam Battery', 'Spotlight Cam Plus', 'Floodlight Cam Wired Pro', 'Video Doorbell Pro 2'],
      Nest: ['Cam Outdoor', 'Cam Indoor', 'Doorbell (battery)', 'Cam IQ Outdoor']
    },
    lenses: ['2.8mm f/2.0', '4mm f/1.6', '6mm f/1.4', '8mm f/2.4', '12mm f/1.4', 'Varifocal 2.8-12mm', 'PTZ 4.3-129mm', 'Fisheye 1.27mm']
  },
  gaming: {
    makes: ['PlayStation', 'Xbox', 'Nintendo', 'Steam', 'ROG', 'Elgato', 'Razer', 'Corsair'],
    modelsByMake: {
      PlayStation: ['PlayStation 5', 'PlayStation 5 Pro', 'PlayStation Portal', 'PS5 HD Camera'],
      Xbox: ['Xbox Series X', 'Xbox Series S', 'Xbox One X', 'Kinect for Xbox'],
      Nintendo: ['Switch OLED', 'Switch Lite', 'Switch Pro Controller'],
      Steam: ['Steam Deck OLED', 'Steam Deck LCD', 'Steam Controller'],
      ROG: ['ROG Ally', 'ROG Ally X', 'ROG Phone 8 Pro'],
      Elgato: ['Game Capture 4K60 S+', 'HD60 X', 'Stream Deck', 'Cam Link 4K'],
      Razer: ['Kiyo Pro Ultra', 'Seiren V3 Pro', 'StreamController X'],
      Corsair: ['Elgato 4K60 Pro MK.2', 'Stream Deck XL', 'Facecam Pro']
    },
    lenses: ['HDR Gaming Capture', '4K@120fps', 'Ray Tracing Capture', 'VRR Support', 'Low Latency']
  },
  automotive: {
    makes: ['Tesla', 'BMW', 'Mercedes', 'Audi', 'Garmin', 'Blackvue', 'Thinkware', 'Nextbase', 'Viofo'],
    modelsByMake: {
      Tesla: ['Model S Plaid', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
      BMW: ['iDrive 8', 'BMW Live Cockpit', 'Parking Assistant Plus', '360° Camera'],
      Mercedes: ['MBUX', 'Surround View', 'Parking Package', 'Driver Assistance Package'],
      Audi: ['MMI touch', 'Audi Virtual Cockpit', 'Top View Camera', 'Park Assist'],
      Garmin: ['Dash Cam 67W', 'Dash Cam Mini 2', 'Dash Cam Tandem', 'Dash Cam Live'],
      Blackvue: ['DR900X-2CH', 'DR770X-2CH', 'DR590X-2CH', 'DR490L-2CH'],
      Thinkware: ['U1000', 'Q800PRO', 'F200PRO', 'FA200'],
      Nextbase: ['622GW', '522GW', '422GW', '322GW'],
      Viofo: ['A139 Pro', 'A129 Plus Duo', 'A119 V3', 'MT1']
    },
    lenses: ['Wide 140° FOV', 'Rear 120° FOV', '360° Surround View', 'Night Vision', 'Parking Mode', 'G-Sensor']
  },
  medical: {
    makes: ['Olympus Medical', 'Fujifilm Healthcare', 'Canon Medical', 'Philips', 'Siemens Healthineers', 'GE Healthcare'],
    modelsByMake: {
      'Olympus Medical': ['EVIS X1', 'CV-190', 'OES Pro', 'VISERA ELITE III', 'ENDOEYE FLEX 3D'],
      'Fujifilm Healthcare': ['ELUXEO 7000', 'EPX-4450HD', 'SonoSite Edge II', 'FCR Prima T2'],
      'Canon Medical': ['Alphenix Core+', 'CXDI-820C Wireless', 'Vitrea Advanced Visualization'],
      Philips: ['EPIQ Elite', 'ClearVue 850', 'Azurion', 'DigitalDiagnost C90'],
      'Siemens Healthineers': ['ACUSON Sequoia', 'SOMATOM Force', 'Cios Spin', 'Artis Q'],
      'GE Healthcare': ['LOGIQ E10', 'Venue Go', 'Discovery MI', 'Revolution CT']
    },
    lenses: ['DICOM Compliant', 'High Resolution Sensor', 'X-Ray Compatible', 'Ultrasound Probe', 'Endoscopic Lens']
  },
  astro: {
    makes: ['ZWO', 'QHY', 'SBIG', 'Moravian', 'Atik', 'PlayerOne', 'Celestron', 'Meade'],
    modelsByMake: {
      ZWO: ['ASI6200MM Pro', 'ASI2600MC Pro', 'ASI183MM Pro', 'ASI294MC Pro', 'ASI533MC Pro'],
      QHY: ['QHY600M', 'QHY268M', 'QHY183M', 'QHY294M', 'QHY367C'],
      SBIG: ['STXL-6303E', 'STX-16803', 'STF-8300M', 'STXL-11002M'],
      Moravian: ['G4-16000', 'G3-16200', 'G2-8300', 'C1-6000'],
      Atik: ['Horizon', 'Apx60', '460EX', '383L+'],
      PlayerOne: ['Neptune-C II', 'Poseidon-M', 'Apollo-M MAX', 'Ceres-C'],
      Celestron: ['NexImage 5', 'NexImage Burst', 'Skyris 618C'],
      Meade: ['Deep Sky Imager Pro III', 'LPI-G Advanced']
    },
    lenses: ['Cooled CCD', 'CMOS Sensor', 'H-alpha Filter', 'OIII Filter', 'SII Filter', 'RGB Filter Set', 'Narrowband']
  },
  satellite: {
    makes: ['Landsat', 'Sentinel', 'WorldView', 'GeoEye', 'SPOT', 'IKONOS', 'QuickBird', 'Pleiades'],
    modelsByMake: {
      Landsat: ['Landsat 9', 'Landsat 8', 'Landsat 7', 'Landsat 5 TM'],
      Sentinel: ['Sentinel-2A', 'Sentinel-2B', 'Sentinel-1A', 'Sentinel-3A'],
      WorldView: ['WorldView-4', 'WorldView-3', 'WorldView-2', 'WorldView-1'],
      GeoEye: ['GeoEye-1', 'GeoEye-2'],
      SPOT: ['SPOT-7', 'SPOT-6', 'SPOT-5'],
      IKONOS: ['IKONOS-2'],
      QuickBird: ['QuickBird-2'],
      Pleiades: ['Pleiades-1A', 'Pleiades-1B']
    },
    lenses: ['Multispectral Sensor', 'Panchromatic', 'Hyperspectral', 'Thermal Infrared', 'SAR', 'VNIR', 'SWIR']
  },
  cinema: {
    makes: ['RED', 'ARRI', 'Blackmagic', 'Sony Professional', 'Canon Cinema', 'Panasonic Professional'],
    modelsByMake: {
      RED: ['V-Raptor XL', 'V-Raptor', 'Komodo 6K', 'Ranger Monstro', 'Gemini 5K S35'],
      ARRI: ['Alexa 35', 'Alexa Mini LF', 'Alexa SXT', 'Amira'],
      Blackmagic: ['URSA Mini Pro 12K', 'Pocket Cinema 6K Pro', 'Studio Camera 4K Plus', 'ATEM Camera'],
      'Sony Professional': ['FX9', 'FX6', 'FX3', 'Venice 2', 'FS7 II'],
      'Canon Cinema': ['EOS C70', 'EOS C300 Mark III', 'EOS C500 Mark II', 'EOS C200'],
      'Panasonic Professional': ['EVA1', 'VariCam LT', 'AG-CX350', 'HC-X2000']
    },
    lenses: ['PL Mount', 'EF Mount', 'RF Mount', 'E Mount', 'MFT Mount', 'Cinema Zoom', 'Cinema Prime']
  },
  microscope: {
    makes: ['Olympus', 'Nikon', 'Zeiss', 'Leica Microsystems', 'Keyence', 'AmScope'],
    modelsByMake: {
      Olympus: ['BX53', 'CX23', 'IX73', 'SZX16', 'LEXT OLS5000'],
      Nikon: ['Eclipse Ni-E', 'Eclipse Ti2', 'SMZ1270', 'AZ100M'],
      Zeiss: ['Axio Observer', 'Axio Scope.A1', 'SteREO Discovery.V20', 'LSM 980'],
      'Leica Microsystems': ['DM6 B', 'DM750', 'M165 FC', 'SP8 LIGHTNING'],
      Keyence: ['VHX-7000', 'VK-X1000', 'BZ-X810'],
      AmScope: ['ME520T-A', 'SM-4TZ-144A', 'B120C-E1']
    },
    lenses: ['10x Objective', '40x Objective', '100x Oil Immersion', 'Phase Contrast', 'DIC', 'Fluorescence', 'Darkfield']
  },
  surveillance: {
    makes: ['FLIR', 'Pelco', 'Avigilon', 'Milestone', 'Genetec', 'Hanwha Techwin', 'Honeywell'],
    modelsByMake: {
      FLIR: ['PT-617-HD', 'Saros DH-390', 'Quasar 4K', 'Elara FC-Series O'],
      Pelco: ['Spectra Enhanced', 'Optera IMM', 'Sarix Professional', 'VideoXpert'],
      Avigilon: ['H5A Camera Line', 'H4 HD', 'H3 Thermal', 'Alta'],
      Milestone: ['XProtect Corporate', 'XProtect Professional+', 'XProtect Express+'],
      Genetec: ['Security Center', 'Omnicast', 'Stratocast'],
      'Hanwha Techwin': ['Wisenet P', 'Wisenet Q', 'Wisenet X'],
      Honeywell: ['equIP', 'HDZ', 'HQA', 'HBW']
    },
    lenses: ['Thermal Imaging', 'PTZ 30x Zoom', 'AI Analytics', 'Face Recognition', 'LPR', 'Behavioral Analytics']
  },
  broadcast: {
    makes: ['Sony Professional', 'Panasonic Broadcast', 'JVC', 'Grass Valley', 'Canon Broadcast', 'Hitachi'],
    modelsByMake: {
      'Sony Professional': ['HDC-5500', 'PXW-Z750', 'HDC-3500', 'PXW-X400', 'FDR-AX700'],
      'Panasonic Broadcast': ['AK-UC4000', 'AG-UX180', 'AW-UE155', 'AK-HC5000'],
      JVC: ['GY-HC500', 'GY-HM250', 'GY-HC900', 'GY-HM170'],
      'Grass Valley': ['LDX 100', 'LDX 86N', 'LDX C86N'],
      'Canon Broadcast': ['XF605', 'XF405', 'XA75', 'XA65'],
      Hitachi: ['SK-HD1300', 'Z-HD5500', 'DK-H100']
    },
    lenses: ['Studio Zoom', 'ENG Lens', 'Box Lens', 'Broadcast Prime', 'Teleprompter', 'Servo Zoom']
  }
}

const ISO_PRESETS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
const EXPOSURE_TIMES = ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/200', '1/160', '1/125', '1/80', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '5', '10']
const FNUMBERS = [1.2, 1.4, 1.8, 2, 2.2, 2.8, 3.5, 4, 5.6, 8, 11, 16, 22]
const FOCALS = [12, 14, 16, 18, 20, 24, 28, 30, 35, 40, 50, 55, 70, 85, 105, 135, 200]
const EXPOSURE_PROGRAMS = [
  { v: 1, label: 'Ручной' },
  { v: 2, label: 'Программа' },
  { v: 3, label: 'Приоритет диафрагмы' },
  { v: 4, label: 'Приоритет выдержки' },
  { v: 5, label: 'Творческий' },
  { v: 6, label: 'Действие' },
  { v: 7, label: 'Портрет' },
  { v: 8, label: 'Пейзаж' }
]
const METERING_MODES = [
  { v: 0, label: 'Не задано' },
  { v: 1, label: 'Средний' },
  { v: 2, label: 'Центровзвешенный' },
  { v: 3, label: 'Точечный' },
  { v: 4, label: 'Мульти‑точечный' },
  { v: 5, label: 'Матрица' },
  { v: 6, label: 'Частичный' },
  { v: 255, label: 'Другое' }
]
const FLASH_MODES = [
  { v: 0, label: 'Нет вспышки' },
  { v: 1, label: 'Сработала' },
  { v: 5, label: 'Сработала (без возврата)' },
  { v: 7, label: 'Сработала (возврат)' },
  { v: 9, label: 'Сработала (принудительно)' },
  { v: 16, label: 'Выключена' }
]
const WHITE_BALANCES = [
  { v: 0, label: 'Авто' },
  { v: 1, label: 'Ручной' }
]
const COLOR_SPACES = ['sRGB', 'AdobeRGB', 'Display P3', 'ProPhoto RGB']
const RATINGS = [0, 1, 2, 3, 4, 5]

const LOCATION_PRESETS = [
  { id: 'none', label: '— Без пресета —' },
  { id: 'kyiv', label: 'Киев, Украина', lat: 50.4501, lon: 30.5234, alt: 179, city: 'Kyiv', state: 'Kyiv', country: 'Ukraine' },
  { id: 'warsaw', label: 'Варшава, Польша', lat: 52.2297, lon: 21.0122, alt: 100, city: 'Warsaw', state: 'Mazovia', country: 'Poland' },
  { id: 'berlin', label: 'Берлин, Германия', lat: 52.52, lon: 13.405, alt: 34, city: 'Berlin', state: 'Berlin', country: 'Germany' },
  { id: 'london', label: 'Лондон, Великобритания', lat: 51.5074, lon: -0.1278, alt: 35, city: 'London', state: 'England', country: 'United Kingdom' }
]


export default function NewApp() {
  const { t } = useTranslation()
  const [active, setActive] = useState<'files'|'ready'>('files')
  const files = useAppStore(s=>s.files)
  const setFiles = useAppStore(s=>s.setFiles)
  const addFiles = useAppStore(s=>s.addFiles)
  const removeAt = useAppStore(s=>s.removeAt)
  
  const [customTemplates = [], setCustomTemplates] = useLocalStorage<CustomTemplate[]>('custom-templates', [])
  const [outputDir, setOutputDir] = useLocalStorage('output-dir', '')
  const [format, setFormat] = useLocalStorage<'jpg'|'png'|'webp'|'avif'|'heic'>('format', 'jpg')
  const [quality, setQuality] = useLocalStorage('quality', 85)
  const [colorDrift, setColorDrift] = useState(2)
  const [resizeDrift, setResizeDrift] = useState(2)
  const [resizeMaxW, setResizeMaxW] = useState(0)
  const [removeGps, setRemoveGps] = useState(true)
  const [dateStrategy, setDateStrategy] = useState<'now'|'offset'>('now')
  const [showConfetti, setShowConfetti] = useState(false)
  const [perf, setPerf] = useState<{ reduceAnimations: boolean; confettiEnabled: boolean; maxConcurrency?: number; backgroundAnimations?: boolean; lazyLoadImages?: boolean; virtualScrolling?: boolean }>({ 
    reduceAnimations: false, 
    confettiEnabled: false,
    backgroundAnimations: false,
    lazyLoadImages: false,
    virtualScrolling: false
  })
  useEffect(() => {
    (async () => {
      try { const r = await (window.api as any).settings?.get?.(); const v = r && r.data && r.data.performance ? r.data.performance : null; if (v) setPerf((p:any)=>({ ...p, ...v })) } catch {}
    })()
  }, [])
  const { width, height } = useWindowSize()
  const [dateOffsetMinutes, setDateOffsetMinutes] = useState(0)
  const [uniqueId, setUniqueId] = useState(true)
  const [removeAll, setRemoveAll] = useState(false)
  const [softwareTag, setSoftwareTag] = useState(true)
  const [fake, setFake] = useState(false)
  const [fakeProfile, setFakeProfile] = useState<ProfileKind>('camera')
  const [fakeMake, setFakeMake] = useState('')
  const [fakeModel, setFakeModel] = useState('')
  const [fakeLens, setFakeLens] = useState('')
  const [fakeSoftware, setFakeSoftware] = useState('')
  const [fakeSerial, setFakeSerial] = useState('')
  const [fakeGps, setFakeGps] = useState(false)
  const [fakeLat, setFakeLat] = useState('')
  const [fakeLon, setFakeLon] = useState('')
  const [fakeAltitude, setFakeAltitude] = useState('')
  const [fakeAuto, setFakeAuto] = useState(true)
  const [fakePerFile, setFakePerFile] = useState(true)
  const [onlineAuto, setOnlineAuto] = useState(true)
  const [fakeIso, setFakeIso] = useState<number|''>('')
  const [fakeExposureTime, setFakeExposureTime] = useState('')
  const [fakeFNumber, setFakeFNumber] = useState<number|''>('')
  const [fakeFocalLength, setFakeFocalLength] = useState<number|''>('')
  const [fakeExposureProgram, setFakeExposureProgram] = useState<number|''>('')
  const [fakeMeteringMode, setFakeMeteringMode] = useState<number|''>('')
  const [fakeFlash, setFakeFlash] = useState<number|''>('')
  const [fakeWhiteBalance, setFakeWhiteBalance] = useState<number|''>('')
  const [fakeColorSpace, setFakeColorSpace] = useState('')
  const [fakeRating, setFakeRating] = useState<number|''>('')
  const [fakeLabel, setFakeLabel] = useState('')
  const [fakeTitle, setFakeTitle] = useState('')
  const [fakeCity, setFakeCity] = useState('')
  const [fakeState, setFakeState] = useState('')
  const [fakeCountry, setFakeCountry] = useState('')
  const [locationPreset, setLocationPreset] = useState('none')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [copyright, setCopyright] = useState('')
  const [creatorTool, setCreatorTool] = useState('')
  const [fakeTab, setFakeTab] = useState<'general'|'location'|'metadata'|'camera'>('general')
  const [presetOption, setPresetOption] = useState('')
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false)
  const [mobileSyncOpen, setMobileSyncOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; lastFile: string; etaMs?: number; speedBps?: number; percent?: number }>({ current: 0, total: 0, lastFile: '' })
  const [results, setResults] = useState<{ src: string; out: string }[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaPayload, setMetaPayload] = useState<any>(null)
  const [statsData, setStatsData] = useState<any[]>([])
  const startTimeRef = useRef<number>(Date.now())
  const settingsRef = useRef<HTMLDivElement>(null)
  const filesGridRef = useRef<HTMLDivElement>(null)
  const resultsGridRef = useRef<HTMLDivElement>(null)
  
  const [debouncedQuality, setDebouncedQuality] = useState(quality)
  const [debouncedColorDrift, setDebouncedColorDrift] = useState(colorDrift)
  
  useDebounce(() => setDebouncedQuality(quality), 300, [quality])
  useDebounce(() => setDebouncedColorDrift(colorDrift), 300, [colorDrift])

  const hasFeature = useAppStore(s=>s.hasFeature)
  const proAdvanced = hasFeature('advanced_drift')
  const proApi = hasFeature('api_access')

  useEffect(() => {
    ;(async () => {
      try {
        const r = await window.api.ui.loadState()
        if (r && r.ok && r.data) {
          const d = r.data as any
          if (Array.isArray(d.files)) setFiles(d.files)
          if (typeof d.outputDir==='string') setOutputDir(d.outputDir)
          if (d.format) setFormat(d.format)
          if (typeof d.quality==='number') setQuality(d.quality)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try { window.api.ui.saveState({ files, outputDir, format, quality, active }) } catch {}
  }, [files, outputDir, format, quality, active])

  useEffect(() => {
    if (!proAdvanced && (format === 'webp' || format === 'avif' || format === 'heic')) setFormat('jpg')
  }, [proAdvanced])

  useEffect(() => {
    const qn = Number(quality || 0)
    if (!proAdvanced && qn > 85) setQuality(85)
  }, [proAdvanced, quality])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const mk = p.makes[0] || ''
    setFakeMake(mk)
    const md = (p.modelsByMake?.[mk] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[mk] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeProfile])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const md = (p.modelsByMake?.[fakeMake] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[fakeMake] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeMake])

  useEffect(() => {
    const preset = LOCATION_PRESETS.find(x => x.id === locationPreset) as any
    if (!preset || preset.id === 'none') return
    setFakeLat(String(preset.lat))
    setFakeLon(String(preset.lon))
    setFakeAltitude(String(preset.alt))
    setFakeCity(preset.city || '')
    setFakeState(preset.state || '')
    setFakeCountry(preset.country || '')
  }, [locationPreset])

  

  useEffect(() => {
    if (!proApi && onlineAuto) setOnlineAuto(false)
  }, [proApi, onlineAuto])

  useEffect(() => {
    const off = window.api.onProgress(d => {
      setProgress({ current: d.index + 1, total: d.total, lastFile: d.filePath || d.file, etaMs: Number(d.etaMs||0), speedBps: Number(d.speedBps||0), percent: Number(d.percent)||0 })
      if (d && d.status === 'ok' && d.outPath) {
        const srcPath = String(d.filePath || d.file || '')
        setResults(prev => [...prev, { src: srcPath, out: d.outPath }])
        setStatsData(prev => [...prev, { name: `Файл ${d.index + 1}`, value: d.index + 1 }])
        setFiles(prev => {
          const norm = (p: string) => String(p || '').replace(/\\/g, '/').toLowerCase()
          const target = norm(srcPath)
          const filtered = prev.filter(p => norm(p) !== target)
          if (filtered.length !== prev.length) return filtered
          const i = (typeof d.index === 'number' && d.index >= 0 && d.index < prev.length) ? d.index : -1
          if (i >= 0) {
            const next = prev.slice()
            next.splice(i, 1)
            return next
          }
          return prev
        })
      }
    })
    const done = window.api.onComplete(() => { 
      setBusy(false); 
      setActive('ready');
      setShowConfetti(true);
      setResults(currentResults => {
        toast.success(`🎉 Обработка завершена! ${currentResults.length} фото готово`, {
          duration: 4000,
          style: {
            background: '#059669',
            color: '#fff',
          },
        });
        return currentResults;
      });
      setTimeout(() => setShowConfetti(false), 5000);
    })
    return () => { off(); done() }
  }, [])

  useEffect(() => {
    try {
      const off = window.api.onOsOpenFiles(async (list) => {
        if (Array.isArray(list) && list.length) {
          try { 
            const expanded = await window.api.expandPaths(list); 
            if (expanded && expanded.length) {
              addFiles(expanded);
              toast.success(`📁 Добавлено ${expanded.length} файлов`);
            }
          } catch {}
        }
      })
      return () => { try { off && off() } catch {} }
    } catch {}
  }, [])

  useEffect(() => {
    if (settingsRef.current) autoAnimate(settingsRef.current)
    if (filesGridRef.current) autoAnimate(filesGridRef.current)
    if (resultsGridRef.current) autoAnimate(resultsGridRef.current)
  }, [])

  const canStart = useMemo(() => files.length > 0 && outputDir && !busy, [files, outputDir, busy])

  const selectImages = async () => {
    const paths = await window.api.selectImages()
    if (!paths || !paths.length) return
    
    addFiles(paths)
    
    toast.success(`🖼️ Добавлено ${paths.length} изображений`, {
      duration: 3000,
      style: {
        background: 'var(--bg-success)',
        color: 'var(--text-success)',
      }
    })
  }

  const selectFolder = async () => {
    const paths = await window.api.selectImageDir()
    if (!paths || !paths.length) return
    
    addFiles(paths)
    
    toast.success(`📂 Добавлено ${paths.length} изображений из папки`, {
      duration: 3000,
      style: {
        background: 'var(--bg-success)',
        color: 'var(--text-success)',
      }
    })
  }

  const selectOutput = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const clearFiles = () => {
    setFiles([])
    setProgress({ current: 0, total: 0, lastFile: '' })
    setResults([])
    setSelected(new Set())
  }

  const start = async () => {
    if (!canStart) return
    
    const { isSubscribed } = useAppStore.getState()
    if (files.length > 5 && !isSubscribed()) {
      toast.error('Бесплатная версия ограничена 5 файлами. Подпишитесь для неограниченной обработки!')
      return
    }
    
    setBusy(true)
    startTimeRef.current = Date.now()
    setProgress({ current: 0, total: files.length, lastFile: '', etaMs: 0, speedBps: 0, percent: 0 })
    setResults([])
    setStatsData([])
    const toNum = (v: number|''|string) => { const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(n as number) ? Number(n) : undefined }
    const payload: any = {
      inputFiles: files,
      outputDir,
      format,
      quality: Number(quality),
      colorDrift: Number(colorDrift),
      resizeDrift: Number(resizeDrift),
      resizeMaxW: Number(resizeMaxW),
      naming: '{name}_{index}.{ext}',
      meta: {
        removeGps,
        dateStrategy,
        dateOffsetMinutes: Number(dateOffsetMinutes),
        uniqueId,
        removeAll,
        softwareTag,
        fake,
        author,
        description,
        keywords: keywords ? keywords.split(',').map(s=>s.trim()).filter(Boolean) : [],
        copyright,
        creatorTool,
        fakeProfile,
        fakeMake,
        fakeModel,
        fakeLens,
        fakeSoftware,
        fakeSerial,
        fakeGps,
        fakeLat: toNum(fakeLat),
        fakeLon: toNum(fakeLon),
        fakeAltitude: toNum(fakeAltitude),
        fakeAuto,
        fakePerFile,
        onlineAuto,
        fakeIso: toNum(fakeIso),
        fakeExposureTime,
        fakeFNumber: toNum(fakeFNumber),
        fakeFocalLength: toNum(fakeFocalLength),
        fakeExposureProgram: toNum(fakeExposureProgram),
        fakeMeteringMode: toNum(fakeMeteringMode),
        fakeFlash: toNum(fakeFlash),
        fakeWhiteBalance: toNum(fakeWhiteBalance),
        fakeColorSpace: fakeColorSpace || undefined,
        fakeRating: toNum(fakeRating),
        fakeLabel: fakeLabel || undefined,
        fakeTitle: fakeTitle || undefined,
        fakeCity: fakeCity || undefined,
        fakeState: fakeState || undefined,
        fakeCountry: fakeCountry || undefined
      }
    }
    const perfState = perf || {}
    const withPerf = { ...payload, maxConcurrency: Number(perfState.maxConcurrency || 0) || undefined }
    await window.api.processImages(withPerf)
  }

  const cancel = async () => { if (!busy) return; await window.api.cancel() }

  const makeOptions = (GEAR_PRESETS[fakeProfile]?.makes || []) as string[]
  const modelOptions = ((GEAR_PRESETS[fakeProfile]?.modelsByMake?.[fakeMake]) || []) as string[]
  const lensOptions = ((GEAR_PRESETS[fakeProfile]?.lensesByMake?.[fakeMake]) || (GEAR_PRESETS[fakeProfile]?.lenses) || []) as string[]

  const handleApplyPreset = (preset?: string) => {
    const selectedPreset = preset || 'professional'
    
    switch (selectedPreset) {
      case 'professional':
        setFakeProfile('camera')
        setFakeMake('Canon')
        setFakeModel('EOS R5')
        setFakeLens('RF 24-70mm f/2.8L IS USM')
        setFakeIso(400)
        setFakeExposureTime('1/125')
        setFakeFNumber(2.8)
        setFakeFocalLength(50)
        setAuthor('Professional Photographer')
        setKeywords('professional, photography, portrait, studio')
        setCopyright('© 2024 Professional Studio')
        toast.success('📷 Применен профессиональный шаблон', {
          duration: 3000,
          style: { background: '#7c3aed', color: '#fff' },
          action: {
            label: 'Отменить',
            onClick: () => {
              setPresetOption('')
              setFakeProfile('camera')
              setFakeMake('')
              setFakeModel('')
              setFakeLens('')
              setFakeIso('')
              setFakeExposureTime('')
              setFakeFNumber('')
              setFakeFocalLength('')
              setAuthor('')
              setKeywords('')
              setCopyright('')
              toast.dismiss()
            }
          }
        })
        break
      case 'travel':
        setFakeProfile('camera')
        setFakeMake('Sony')
        setFakeModel('α7R IV')
        setFakeGps(true)
        setLocationPreset('kyiv')
        setFakeIso(200)
        setFakeExposureTime('1/500')
        setKeywords('travel, journey, adventure, explore')
        setDescription('Amazing travel photography')
        toast.success('✈️ Применен шаблон путешествий', {
          duration: 3000,
          style: { background: '#0891b2', color: '#fff' },
          action: { label: 'Отменить', onClick: () => { setPresetOption(''); setFakeMake(''); setFakeModel(''); setFakeGps(false); setLocationPreset('none'); setFakeIso(''); setFakeExposureTime(''); setKeywords(''); setDescription(''); toast.dismiss() } }
        })
        break
      case 'nature':
        setFakeProfile('camera')
        setFakeMake('Nikon')
        setFakeModel('Z9')
        setFakeLens('NIKKOR Z 100-400mm f/4.5-5.6 VR S')
        setFakeIso(800)
        setFakeFocalLength(300)
        setKeywords('nature, wildlife, landscape, outdoor')
        setDescription('Nature and wildlife photography')
        toast.success('🌿 Применен природный шаблон', {
          duration: 3000,
          style: { background: '#059669', color: '#fff' },
          action: { label: 'Отменить', onClick: () => { setPresetOption(''); setFakeMake(''); setFakeModel(''); setFakeLens(''); setFakeIso(''); setFakeFocalLength(''); setKeywords(''); setDescription(''); toast.dismiss() } }
        })
        break
      case 'studio':
        setFakeProfile('camera')
        setFakeMake('Hasselblad')
        setFakeModel('X1D II 50C')
        setFakeIso(100)
        setFakeExposureTime('1/60')
        setFakeFNumber(8)
        setFakeFlash(1)
        setKeywords('studio, portrait, fashion, commercial')
        setCreatorTool('Capture One Pro')
        toast.success('💡 Применен студийный шаблон', {
          duration: 3000,
          style: { background: '#dc2626', color: '#fff' },
          action: { label: 'Отменить', onClick: () => { setPresetOption(''); setFakeMake(''); setFakeModel(''); setFakeIso(''); setFakeExposureTime(''); setFakeFNumber(''); setFakeFlash(''); setKeywords(''); setCreatorTool(''); toast.dismiss() } }
        })
        break
      case 'street':
        setFakeProfile('camera')
        setFakeMake('Fujifilm')
        setFakeModel('X-T5')
        setFakeLens('XF23mmF2 R WR')
        setFakeIso(1600)
        setFakeExposureTime('1/250')
        setFakeFNumber(5.6)
        setFakeColorSpace('sRGB')
        setKeywords('street, urban, city, documentary')
        setDescription('Street photography')
        toast.success('🏙️ Применен уличный шаблон', {
          duration: 3000,
          style: { background: '#ea580c', color: '#fff' },
          action: { label: 'Отменить', onClick: () => { setPresetOption(''); setFakeMake(''); setFakeModel(''); setFakeLens(''); setFakeIso(''); setFakeExposureTime(''); setFakeFNumber(''); setFakeColorSpace(''); setKeywords(''); setDescription(''); toast.dismiss() } }
        })
        break
    }
  }

  const getCurrentSettings = (): Partial<CustomTemplate> => ({
    general: {
      fakeAuto,
      fakePerFile,
      onlineAuto
    },
    location: {
      enabled: fakeGps,
      lat: fakeLat,
      lon: fakeLon,
      altitude: fakeAltitude,
      city: fakeCity,
      state: fakeState,
      country: fakeCountry
    },
    metadata: {
      author,
      description,
      keywords,
      copyright,
      creatorTool,
      title: fakeTitle,
      label: fakeLabel,
      rating: fakeRating,
      colorSpace: fakeColorSpace
    },
    camera: {
      profile: fakeProfile,
      make: fakeMake,
      model: fakeModel,
      lens: fakeLens,
      software: fakeSoftware,
      serial: fakeSerial,
      iso: fakeIso,
      exposureTime: fakeExposureTime,
      fNumber: fakeFNumber,
      focalLength: fakeFocalLength,
      exposureProgram: fakeExposureProgram,
      meteringMode: fakeMeteringMode,
      flash: fakeFlash,
      whiteBalance: fakeWhiteBalance
    }
  })

  const saveTemplate = (template: CustomTemplate) => {
    setCustomTemplates([...customTemplates, template])
    toast.success(`✨ Шаблон "${template.name}" сохранен!`, {
      duration: 3000,
      style: { background: '#8b5cf6', color: '#fff' }
    })
  }

  const applyCustomTemplate = (template: CustomTemplate) => {
    if (template.general) {
      if (template.general.fakeAuto !== undefined) setFakeAuto(template.general.fakeAuto)
      if (template.general.fakePerFile !== undefined) setFakePerFile(template.general.fakePerFile)
      if (template.general.onlineAuto !== undefined) setOnlineAuto(template.general.onlineAuto)
    }

    if (template.location) {
      if (template.location.enabled !== undefined) setFakeGps(template.location.enabled)
      if (template.location.lat) setFakeLat(template.location.lat)
      if (template.location.lon) setFakeLon(template.location.lon)
      if (template.location.altitude) setFakeAltitude(template.location.altitude)
      if (template.location.city) setFakeCity(template.location.city)
      if (template.location.state) setFakeState(template.location.state)
      if (template.location.country) setFakeCountry(template.location.country)
    }

    if (template.metadata) {
      if (template.metadata.author) setAuthor(template.metadata.author)
      if (template.metadata.description) setDescription(template.metadata.description)
      if (template.metadata.keywords) setKeywords(template.metadata.keywords)
      if (template.metadata.copyright) setCopyright(template.metadata.copyright)
      if (template.metadata.creatorTool) setCreatorTool(template.metadata.creatorTool)
      if (template.metadata.title) setFakeTitle(template.metadata.title)
      if (template.metadata.label) setFakeLabel(template.metadata.label)
      if (template.metadata.rating !== undefined) setFakeRating(template.metadata.rating)
      if (template.metadata.colorSpace) setFakeColorSpace(template.metadata.colorSpace)
    }

    if (template.camera) {
      if (template.camera.profile) setFakeProfile(template.camera.profile)
      if (template.camera.make) setFakeMake(template.camera.make)
      if (template.camera.model) setFakeModel(template.camera.model)
      if (template.camera.lens) setFakeLens(template.camera.lens)
      if (template.camera.software) setFakeSoftware(template.camera.software)
      if (template.camera.serial) setFakeSerial(template.camera.serial)
      if (template.camera.iso !== undefined) setFakeIso(template.camera.iso)
      if (template.camera.exposureTime) setFakeExposureTime(template.camera.exposureTime)
      if (template.camera.fNumber !== undefined) setFakeFNumber(template.camera.fNumber)
      if (template.camera.focalLength !== undefined) setFakeFocalLength(template.camera.focalLength)
      if (template.camera.exposureProgram !== undefined) setFakeExposureProgram(template.camera.exposureProgram)
      if (template.camera.meteringMode !== undefined) setFakeMeteringMode(template.camera.meteringMode)
      if (template.camera.flash !== undefined) setFakeFlash(template.camera.flash)
      if (template.camera.whiteBalance !== undefined) setFakeWhiteBalance(template.camera.whiteBalance)
    }

    toast.success(`${template.icon || '⭐'} Шаблон "${template.name}" применен!`, {
      duration: 3000,
      style: { background: '#8b5cf6', color: '#fff' }
    })
  }

  const deleteTemplate = (id: string) => {
    const template = customTemplates.find(t => t.id === id)
    if (!template) return

    setCustomTemplates(customTemplates.filter(t => t.id !== id))
    toast.success(`🗑️ Шаблон "${template.name}" удален`, {
      duration: 2000,
      style: { background: '#ef4444', color: '#fff' }
    })
  }


  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка приложения..." />
      </div>
    }>
      <div className="h-full text-white relative dark:text-slate-100">
        {perf.backgroundAnimations && <AnimatedBackground />}
        
        {perf.confettiEnabled && showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.1}
          />
        )}
        <div className="toaster-container" />
      
      <div className="h-full relative">
        <div className="px-4 py-3 border-b border-white/10 bg-black/10 dark:bg-black/20 backdrop-blur overflow-x-auto with-gutter">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
            <ModernButton onClick={selectImages} size="sm" variant="primary" icon={<FaImage className="w-4 h-4" />} tilt>
              {t('buttons.addFiles')}
            </ModernButton>
            <ModernButton onClick={selectFolder} size="sm" variant="success" icon={<FaFolderOpen className="w-4 h-4" />} tilt>
              {t('buttons.addFolder')}
            </ModernButton>
            <ModernButton onClick={() => setMobileSyncOpen(true)} size="sm" variant="primary" icon={<FaQrcode className="w-4 h-4" />} tilt>
              📱 Mobile
            </ModernButton>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
            <ModernButton onClick={selectOutput} size="sm" variant="warning" icon={<FaFolder className="w-4 h-4" />}>
              {t('common.pickFolder')}
            </ModernButton>
            <ModernButton onClick={clearFiles} size="sm" variant="danger" icon={<FaTrash className="w-4 h-4" />}>
              {t('buttons.clear')}
            </ModernButton>
            </div>
            {!!outputDir && (
              <div className="text-xs opacity-80 truncate max-w-[320px] px-3 py-2 rounded-lg border border-white/10 bg-white/60 text-slate-900 dark:bg-slate-800/60 dark:text-slate-100">📁 {outputDir.split(/[/\\]/).pop()}</div>
            )}
            <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
            {!busy && (
              <FeatureGateCompact feature="batch_processing" showUpgrade={files.length > 3}>
                <ModernButton onClick={start} size="sm" variant="primary" icon={<FaPlay className="w-4 h-4" />} disabled={!canStart} loading={busy}>
                  {t('buttons.start')}
                  {files.length > 3 && <PremiumBadgeCompact feature="batch_processing" />}
                </ModernButton>
              </FeatureGateCompact>
            )}
            {busy && (
              <ModernButton onClick={cancel} size="sm" variant="secondary" icon={<FaStop className="w-4 h-4" />}>
                {t('buttons.cancel')}
              </ModernButton>
            )}
            </div>

            <div className="ml-auto inline-flex items-center gap-2 text-[11px] opacity-80">
              <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5">Файлов: {files.length}</span>
              <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5">Выбрано: {selected.size}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-6" ref={settingsRef}>
          <div className="glass-card rounded-xl p-4 transition-all duration-300">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Основные настройки
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 text-xs">
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Формат</span>
                <CustomSelect
                  value={format || 'jpg'}
                  onChange={(value) => setFormat(value as any)}
                  options={[
                    { value: 'jpg', label: 'JPG', icon: '📷' },
                    { value: 'png', label: 'PNG', icon: '🖼️' },
                    { value: 'webp', label: 'WEBP', icon: (
                      <span className="inline-flex items-center gap-1">
                        <span>🌐</span>
                        {proAdvanced && <FaCrown className="w-3 h-3 text-amber-400" />}
                      </span>
                    ) },
                    { value: 'avif', label: 'AVIF', icon: (
                      <span className="inline-flex items-center gap-1">
                        <span>⚡</span>
                        {proAdvanced && <FaCrown className="w-3 h-3 text-amber-400" />}
                      </span>
                    ) },
                    { value: 'heic', label: 'HEIC', icon: (
                      <span className="inline-flex items-center gap-1">
                        <span>🍎</span>
                        {proAdvanced && <FaCrown className="w-3 h-3 text-amber-400" />}
                      </span>
                    ) }
                  ]}
                  lockedValues={proAdvanced ? [] : ['webp','avif','heic']}
                  onLockedClick={()=>{ try { window.dispatchEvent(new CustomEvent('open-subscription')) } catch {} }}
                  placeholder="Выберите формат"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Качество</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={proAdvanced?100:85}
                    step={1}
                    value={quality}
                    onChange={e=>{ const v = Number(e.target.value)||0; if (!proAdvanced && v>85) { try { window.dispatchEvent(new CustomEvent('open-subscription')) } catch {}; setQuality(85) } else { setQuality(v) } }}
                    className="flex-1 accent-amber-500"
                  />
                  <input 
                    type="number" min={1} max={proAdvanced?100:85} value={quality} onChange={e=>{ const v = Number(e.target.value)||0; if (!proAdvanced && v>85) { try { window.dispatchEvent(new CustomEvent('open-subscription')) } catch {}; setQuality(85) } else { setQuality(v) } }} className="w-20 h-9 bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 hover:border-white/20 transition-colors" 
                  />
                </div>
              </label>
              <FeatureGateSide feature="advanced_drift">
                <label className="flex flex-col gap-2">
                  <span className="opacity-70 font-medium flex items-center gap-2">
                    Цвет. дрифт %
                    <PremiumBadgeSide feature="advanced_drift" />
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={colorDrift}
                      onChange={e=>setColorDrift(Number(e.target.value)||0)}
                      className="flex-1 accent-purple-500"
                    />
                    <input 
                      type="number" min={0} max={10} value={colorDrift} onChange={e=>setColorDrift(Number(e.target.value)||0)} className="w-20 h-9 bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 hover:border-white/20 transition-colors" 
                    />
                  </div>
                </label>
              </FeatureGateSide>
              <FeatureGateSide feature="advanced_drift">
                <label className="flex flex-col gap-2">
                  <span className="opacity-70 font-medium flex items-center gap-2">
                    Размер дрифт %
                    <PremiumBadgeSide feature="advanced_drift" />
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={resizeDrift}
                      onChange={e=>setResizeDrift(Number(e.target.value)||0)}
                      className="flex-1 accent-purple-500"
                    />
                    <input 
                      type="number" min={0} max={10} value={resizeDrift} onChange={e=>setResizeDrift(Number(e.target.value)||0)} className="w-20 h-9 bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 hover:border-white/20 transition-colors" 
                    />
                  </div>
                </label>
              </FeatureGateSide>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Макс. ширина</span>
                <input 
                  type="number" min={0} value={resizeMaxW} onChange={e=>setResizeMaxW(Number(e.target.value)||0)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" 
                />
              </label>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/40">
                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Метаданные
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={removeGps} 
                    onChange={e=>setRemoveGps(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">
                      <Icon name="tabler:gps" className="w-4 h-4 text-blue-400" />
                      Удалить GPS данные
                      {removeGps && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Удаляет координаты и геолокацию</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    removeAll ? 'bg-slate-800/30 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 border-white/5'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={uniqueId} 
                    onChange={e=>setUniqueId(e.target.checked)}
                    disabled={removeAll}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">
                      <Icon name="tabler:key" className="w-4 h-4 text-blue-400" />
                      Уникальный ID
                      {uniqueId && !removeAll && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Генерирует уникальный идентификатор</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    fake ? 'bg-slate-700/20 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-rose-900/30 to-red-900/30 hover:from-rose-900/40 hover:to-red-900/40 border-rose-500/20'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={removeAll} 
                    onChange={e => {
                      if (!fake) {
                        setRemoveAll(e.target.checked)
                        if (e.target.checked) {
                          setFake(false)
                        }
                      }
                    }} 
                    disabled={fake}
                    className="w-4 h-4 text-rose-600 bg-gray-700 border-gray-600 rounded focus:ring-rose-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-colors ${fake ? 'text-slate-600' : 'text-white group-hover:text-rose-300'}`}>
                      <FaTrash className="inline w-3 h-3 mr-1" />
                      Удалить все метаданные
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {fake ? '⚠️ Недоступно при фейковых метаданных' : 'Полная очистка EXIF, IPTC, XMP'}
                    </p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    removeAll ? 'bg-slate-800/30 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 border-white/5'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={softwareTag} 
                    onChange={e=>setSoftwareTag(e.target.checked)}
                    disabled={removeAll}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">
                      <Icon name="tabler:tags" className="w-4 h-4 text-blue-400" />
                      Добавить тег Software
                      {softwareTag && !removeAll && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Добавляет информацию о программе</p>
                  </div>
                </label>
              </div>
              <div className="space-y-3">
                  <label className="flex flex-col gap-2">
                    <span className="opacity-70 font-medium">Дата</span>
                  <CustomSelect
                      value={dateStrategy}
                      onChange={(value) => setDateStrategy(value as any)}
                      options={[
                        { value: 'now', label: 'Текущее время', icon: '🕐' },
                        { value: 'offset', label: 'Смещение', icon: '⏰' }
                      ]}
                    lockedValues={[]}
                      placeholder="Выберите стратегию"
                    />
                  </label>
                {dateStrategy === 'offset' && (
                  <label className="flex flex-col gap-2">
                    <span className="opacity-70 font-medium">Смещение, мин</span>
                    <input type="number" value={dateOffsetMinutes} onChange={e=>setDateOffsetMinutes(Number(e.target.value)||0)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
                  </label>
                )}
                <div className="border-t border-white/10 my-3"></div>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    removeAll ? 'bg-slate-700/20 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 hover:from-purple-900/40 hover:to-indigo-900/40 border-purple-500/20'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={fake} 
                    onChange={e => {
                      if (!removeAll) {
                        setFake(e.target.checked)
                        if (e.target.checked) {
                          setRemoveAll(false)
                        }
                      }
                    }} 
                    disabled={removeAll}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-colors ${
                      removeAll ? 'text-slate-600' : 'text-white group-hover:text-purple-300'
                    }`}>
                      <FaMagic className="inline w-3 h-3 mr-1" />
                      Фейковые метаданные
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {removeAll ? '⚠️ Недоступно при удалении метаданных' : 'Генерирует реалистичные EXIF данные'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {fake && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setFakeTab('general')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'general' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:settings" className="w-4 h-4 inline mr-2" />
                  Основные
                </button>
                <button
                  onClick={() => setFakeTab('location')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'location' ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:map-pin" className="w-4 h-4 inline mr-2" />
                  Геолокация
                </button>
                <button
                  onClick={() => setFakeTab('metadata')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'metadata' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:file-info" className="w-4 h-4 inline mr-2" />
                  Метаданные
                </button>
                <button
                  onClick={() => setFakeTab('camera')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'camera' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:camera" className="w-4 h-4 inline mr-2" />
                  Камера
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateManagerOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg relative"
                >
                  <Icon name="tabler:bookmarks" className="w-4 h-4 inline mr-2" />
                  Мои шаблоны
                  {customTemplates.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {customTemplates.length}
                    </span>
                  )}
                </button>
                <FeatureGateCompact feature="advanced_drift">
                  <button
                    onClick={() => handleApplyPreset()}
                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    <Icon name="tabler:sparkles" className="w-4 h-4 inline mr-2" />
                    Применить шаблон
                  </button>
                </FeatureGateCompact>
                <FeatureGateCompact feature="advanced_drift">
                  <CustomSelect
                    value={presetOption}
                    onChange={(value) => { 
                      if (value.startsWith('custom-')) {
                        const template = customTemplates.find(t => t.id === value.replace('custom-', ''))
                        if (template) applyCustomTemplate(template)
                      } else {
                        setPresetOption(value)
                        handleApplyPreset(value)
                      }
                    }}
                    options={[
                      ...(customTemplates.length > 0 ? [
                        ...customTemplates.map(t => ({
                          value: `custom-${t.id}`,
                          label: t.name,
                          icon: t.icon || '⭐'
                        })),
                        { value: 'divider', label: '─────────────', icon: '' }
                      ] : []),
                      { value: 'professional', label: 'Профессиональная съемка', icon: '🎯' },
                      { value: 'travel', label: 'Путешествие', icon: '✈️' },
                      { value: 'nature', label: 'Природа', icon: '🌿' },
                      { value: 'studio', label: 'Студийная съемка', icon: '💡' },
                      { value: 'street', label: 'Уличная фотография', icon: '🏙️' }
                    ]}
                    placeholder="Выбрать шаблон..."
                    className="text-sm min-w-[220px]"
                  />
                </FeatureGateCompact>
              </div>
            </div>

            {fakeTab === 'general' && (
              <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    Настройки генерации
                  </span>
                  <span className="text-[11px] opacity-80">
                    {`${fakeAuto ? 'Авто' : 'Ручной'} • ${fakePerFile ? 'Уникально' : 'Одинаково'}${onlineAuto ? ' • Online' : ''}`}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                    <input 
                      type="checkbox" 
                      checked={fakeAuto} 
                      onChange={e=>setFakeAuto(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-purple-200 inline-flex items-center gap-2">
                        <Icon name="tabler:sparkles" className="w-4 h-4" />
                        Авто-генерация
                        {fakeAuto && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Автоматический подбор параметров</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                    <input 
                      type="checkbox" 
                      checked={fakePerFile} 
                      onChange={e=>setFakePerFile(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-purple-200 inline-flex items-center gap-2">
                        <Icon name="tabler:fingerprint" className="w-4 h-4" />
                        Уникально на файл
                        {fakePerFile && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Разные параметры для каждого</p>
                    </div>
                  </label>
                  <FeatureGateSide feature="api_access">
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                      <input 
                        type="checkbox" 
                        checked={onlineAuto} 
                        onChange={e=>setOnlineAuto(e.target.checked)} 
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-purple-200 inline-flex items-center gap-2">
                          <Icon name="tabler:cloud" className="w-4 h-4" />
                          Online дефолты
                          {onlineAuto && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Использовать онлайн базу</p>
                      </div>
                    </label>
                  </FeatureGateSide>
                </div>
              </div>
            )}

            {fakeTab === 'camera' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/20">
                  <h4 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                    <FaCamera className="w-3 h-3" />
                    Устройство и камера
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Профиль</span>
                      <CustomSelect
                        value={fakeProfile}
                        onChange={(value) => setFakeProfile(value as ProfileKind)}
                        options={[
                          { value: 'camera', label: 'Камера', icon: '📷' },
                          { value: 'phone', label: 'Телефон', icon: '📱' },
                          { value: 'action', label: 'Экшн', icon: '📹' },
                          { value: 'drone', label: 'Дрон', icon: '🚁' },
                          { value: 'scanner', label: 'Сканер', icon: '🖨️' },
                          { value: 'webcam', label: 'Веб-камера', icon: '🎥' },
                          { value: 'film', label: 'Пленочная', icon: '🎞️' },
                          { value: 'security', label: 'Видеонаблюдение', icon: '🔒' },
                          { value: 'gaming', label: 'Игровые', icon: '🎮' },
                          { value: 'automotive', label: 'Автомобильные', icon: '🚗' },
                          { value: 'medical', label: 'Медицинские', icon: '🏥' },
                          { value: 'astro', label: 'Астрофото', icon: '🌌' },
                          { value: 'satellite', label: 'Спутниковые', icon: '📡' },
                          { value: 'cinema', label: 'Кинокамеры', icon: '🎬' },
                          { value: 'microscope', label: 'Микроскопы', icon: '🔬' },
                          { value: 'surveillance', label: 'Промнаблюдение', icon: '👁️' },
                          { value: 'broadcast', label: 'Телевизионные', icon: '📺' }
                        ]}
                        placeholder="Выберите профиль"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Производитель</span>
                      <CustomSelect
                        value={fakeMake}
                        onChange={(value) => setFakeMake(value)}
                        options={makeOptions.map(x => ({ value: x, label: x, icon: '📷' }))}
                        placeholder="Выберите производителя"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Модель</span>
                      <CustomSelect
                        value={fakeModel}
                        onChange={(value) => setFakeModel(value)}
                        options={modelOptions.map(x => ({ value: x, label: x, icon: '📸' }))}
                        placeholder="Выберите модель"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Объектив</span>
                      <CustomSelect
                        value={fakeLens}
                        onChange={(value) => setFakeLens(value)}
                        options={lensOptions.map(x => ({ value: x, label: x, icon: '🔍' }))}
                        placeholder="Выберите объектив"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Software</span>
                      <input 
                        value={fakeSoftware} 
                        onChange={e=>setFakeSoftware(e.target.value)} 
                        className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                        placeholder="Photoshop..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Serial</span>
                      <input 
                        value={fakeSerial} 
                        onChange={e=>setFakeSerial(e.target.value)} 
                        className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                        placeholder="123456..."
                      />
                    </label>
                  </div>
                </div>

                <FeatureGate feature="advanced_drift">
                <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
                  <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <FaCog className="w-3 h-3" />
                    Параметры съёмки
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">ISO</span>
                      <CustomSelect
                        value={String(fakeIso)}
                        onChange={(value) => setFakeIso(value ? Number(value) : '')}
                        options={[
                          { value: '', label: 'Авто', icon: '🤖' },
                          ...ISO_PRESETS.map(x => ({ value: String(x), label: String(x), icon: '📸' }))
                        ]}
                        lockedValues={[]}
                        placeholder="Выберите ISO"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Выдержка</span>
                      <CustomSelect
                        value={fakeExposureTime}
                        onChange={(value) => setFakeExposureTime(value)}
                        options={[
                          { value: '', label: 'Авто', icon: '🤖' },
                          ...EXPOSURE_TIMES.map(x => ({ value: x, label: x, icon: '⏱️' }))
                        ]}
                        lockedValues={[]}
                        placeholder="Выберите выдержку"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Диафрагма</span>
                      <CustomSelect
                        value={String(fakeFNumber)}
                        onChange={(value) => setFakeFNumber(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...FNUMBERS.map(x => ({ value: String(x), label: `f/${x}` }))]}
                        lockedValues={[]}
                        placeholder="Диафрагма"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Фокус (мм)</span>
                      <CustomSelect
                        value={String(fakeFocalLength)}
                        onChange={(value) => setFakeFocalLength(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...FOCALS.map(x => ({ value: String(x), label: `${x}мм` }))]}
                        lockedValues={[]}
                        placeholder="Фокус"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Программа</span>
                      <CustomSelect
                        value={String(fakeExposureProgram)}
                        onChange={(value) => setFakeExposureProgram(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...EXPOSURE_PROGRAMS.map(x => ({ value: String(x.v), label: x.label }))]}
                        lockedValues={[]}
                        placeholder="Программа"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Замер</span>
                      <CustomSelect
                        value={String(fakeMeteringMode)}
                        onChange={(value) => setFakeMeteringMode(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...METERING_MODES.map(x => ({ value: String(x.v), label: x.label }))]}
                        lockedValues={[]}
                        placeholder="Замер"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Вспышка</span>
                      <CustomSelect
                        value={String(fakeFlash)}
                        onChange={(value) => setFakeFlash(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...FLASH_MODES.map(x => ({ value: String(x.v), label: x.label }))]}
                        lockedValues={[]}
                        placeholder="Вспышка"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Баланс белого</span>
                      <CustomSelect
                        value={String(fakeWhiteBalance)}
                        onChange={(value) => setFakeWhiteBalance(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Авто' }, ...WHITE_BALANCES.map(x => ({ value: String(x.v), label: x.label }))]}
                        lockedValues={[]}
                        placeholder="Баланс белого"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Цвет. пространство</span>
                      <CustomSelect
                        value={fakeColorSpace || ''}
                        onChange={(value) => setFakeColorSpace(value)}
                        options={[{ value: '', label: 'Авто' }, ...COLOR_SPACES.map(x => ({ value: x, label: x }))]}
                        lockedValues={[]}
                        placeholder="Цвет. пространство"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Рейтинг</span>
                      <CustomSelect
                        value={String(fakeRating)}
                        onChange={(value) => setFakeRating(value ? Number(value) : '')}
                        options={[{ value: '', label: 'Нет' }, ...RATINGS.map(x => ({ value: String(x), label: x > 0 ? '⭐'.repeat(x) : 'Нет' }))]}
                        lockedValues={[]}
                        placeholder="Рейтинг"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10 md:col-span-2 xl:col-span-2">
                      <span className="text-xs font-medium text-blue-300">Заголовок</span>
                      <input 
                        value={fakeTitle} 
                        onChange={e=>setFakeTitle(e.target.value)} 
                        className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                        placeholder="Название изображения..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10 md:col-span-2 xl:col-span-1">
                      <span className="text-xs font-medium text-blue-300">Метка</span>
                      <input 
                        value={fakeLabel} 
                        onChange={e=>setFakeLabel(e.target.value)} 
                        className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                        placeholder="Категория..."
                      />
                    </label>
                  </div>
                </div>
                </FeatureGate>
              </div>
            )}

            {fakeTab === 'location' && (
              <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                <h4 className="text-sm font-semibold text-green-300 mb-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:map-pin" className="w-5 h-5" />
                    Геолокация
                  </span>
                  <span className="text-[11px] text-green-300/80">
                    {(fakeGps ? 'GPS' : 'GPS выкл') + (locationPreset && locationPreset!=='none' ? ' • Пресет' : '')}
                  </span>
                </h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all cursor-pointer border border-green-500/10">
                      <input type="checkbox" checked={fakeGps} onChange={e=>setFakeGps(e.target.checked)} className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
                      <Icon name="tabler:gps" className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-200 inline-flex items-center gap-2">Включить GPS {fakeGps && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}</span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all cursor-pointer border border-green-500/10">
                      <input type="checkbox" checked={!!locationPreset && locationPreset!=='none'} onChange={e=>{ if (!e.target.checked) setLocationPreset('none') }} className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
                      <Icon name="tabler:location" className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-200 inline-flex items-center gap-2">Использовать пресет {locationPreset && locationPreset!=='none' && <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Активно</span>}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-2" className="w-4 h-4" />
                        Пресет локации
                      </span>
                      <CustomSelect
                        value={locationPreset}
                        onChange={(value) => setLocationPreset(value)}
                        options={LOCATION_PRESETS.map(x => ({ value: x.id, label: x.id==='none' ? t('location.none', { defaultValue: x.label }) : x.label }))}
                        placeholder="— Без пресета —"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-north" className="w-4 h-4" />
                        Широта
                      </span>
                      <input value={fakeLat} onChange={e=>setFakeLat(e.target.value)} placeholder="50.45" className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-east" className="w-4 h-4" />
                        Долгота
                      </span>
                      <input value={fakeLon} onChange={e=>setFakeLon(e.target.value)} placeholder="30.52" className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:mountain" className="w-4 h-4" />
                        Высота (м)
                      </span>
                      <input value={fakeAltitude} onChange={e=>setFakeAltitude(e.target.value)} placeholder="100" className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:building" className="w-4 h-4" />
                        {t('fake.city', { defaultValue: 'Город' })}
                      </span>
                      <input value={fakeCity} onChange={e=>setFakeCity(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map" className="w-4 h-4" />
                        {t('fake.state', { defaultValue: 'Регион' })}
                      </span>
                      <input value={fakeState} onChange={e=>setFakeState(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:world" className="w-4 h-4" />
                        {t('fake.country', { defaultValue: 'Страна' })}
                      </span>
                      <input value={fakeCountry} onChange={e=>setFakeCountry(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {fakeTab === 'metadata' && (
              <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
                <h4 className="text-sm font-semibold text-orange-300 mb-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon name="tabler:file-info" className="w-5 h-5" />
                    Метаданные
                  </span>
                  <span className="text-[11px] text-orange-300/80 truncate max-w-[50vw]">
                    {`${author ? 'Автор' : ''}${description ? (author ? ' • ' : '') + 'Описание' : ''}${keywords ? ((author||description) ? ' • ' : '') + 'Ключевые слова' : ''}${copyright ? ((author||description||keywords) ? ' • ' : '') + '©' : ''}${creatorTool ? ((author||description||keywords||copyright) ? ' • ' : '') + 'Софт' : ''}` || '—'}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:user" className="w-4 h-4" />
                      {t('meta.author', { defaultValue: 'Автор' })}
                    </span>
                    <input value={author} onChange={e=>setAuthor(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Введите имя автора" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10 md:col-span-2">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:file-text" className="w-4 h-4" />
                      {t('meta.description', { defaultValue: 'Описание' })}
                    </span>
                    <input value={description} onChange={e=>setDescription(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Описание изображения" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:tags" className="w-4 h-4" />
                      {t('meta.keywords', { defaultValue: 'Ключевые слова' })}
                    </span>
                    <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="слово1, слово2, слово3" className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:copyright" className="w-4 h-4" />
                      Копирайт
                    </span>
                    <input value={copyright} onChange={e=>setCopyright(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="© 2024 Ваша компания" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:tool" className="w-4 h-4" />
                      Программа создания
                    </span>
                    <input value={creatorTool} onChange={e=>setCreatorTool(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Photoshop, GIMP..." />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {progress && progress.total > 0 && (
          <div className="px-2 md:px-4 py-3 md:py-4 border-b border-white/10 bg-black/10 dark:bg-black/20 backdrop-blur sticky top-[88px] z-30">
            <EnhancedStats
              totalFiles={progress.total}
              processedFiles={results.length}
              timeElapsed={Math.floor((Date.now() - startTimeRef.current) / 1000)}
              averageSpeed={results.length / Math.max(1, (Date.now() - startTimeRef.current) / 1000)}
              estimatedTimeRemaining={progress.etaMs ? Math.ceil(progress.etaMs / 1000) : undefined}
            />
          </div>
        )}


        <div className="grid grid-cols-12 gap-0">
          <aside className="hidden lg:block col-span-3 xl:col-span-2 border-r border-white/10 bg-gradient-to-b from-slate-950/60 to-slate-900/60 backdrop-blur-sm">
            <nav className="p-3 space-y-2">
              <button
                onClick={() => setActive('files')}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group ${
                  active === 'files'
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 shadow-lg'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  active === 'files' ? 'bg-blue-500/20' : 'bg-slate-800/50 group-hover:bg-slate-700/50'
                }`}>
                  <Icon name="tabler:folders" className={`w-5 h-5 transition-colors ${
                    active === 'files' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium transition-colors ${
                    active === 'files' ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {t('tabs.files')}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">
                    {files.length} файлов
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActive('ready')}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group ${
                  active === 'ready'
                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 shadow-lg'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  active === 'ready' ? 'bg-green-500/20' : 'bg-slate-800/50 group-hover:bg-slate-700/50'
                }`}>
                  <Icon name="tabler:checks" className={`w-5 h-5 transition-colors ${
                    active === 'ready' ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium transition-colors ${
                    active === 'ready' ? 'text-green-300' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {t('tabs.ready')}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">
                    {results.length} готово
                  </div>
                </div>
              </button>
            </nav>
          </aside>

          <section className="col-span-12 lg:col-span-9 xl:col-span-10 p-2 md:p-4 with-gutter">
            {active==='files' && (
              <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-6">
                <div ref={filesGridRef}>
                  <ImageGrid
                    items={files.map((path, index) => ({
                      id: `file-${index}`,
                      path,
                      selected: selected.has(index)
                    }))}
                  onItemsChange={(items) => {
                    const newPaths = items.map(item => item.path)
                    setFiles(newPaths)
                  }}
                  onPreview={(item) => {
                    setPreviewSrc(toFileUrl(item.path))
                    setPreviewOpen(true)
                  }}
                  onRemove={(item) => {
                    const index = files.indexOf(item.path)
                    if (index !== -1) {
                      removeAt(index)
                      toast.success('🗑️ Файл удален', {
                        duration: 2000,
                        style: { background: 'var(--bg-warning)', color: 'var(--text-warning)' }
                      })
                    }
                  }}
                  onSelectionChange={(selectedItems) => {
                    const indices = new Set(
                      selectedItems.map(item => {
                        const match = item.id.match(/file-(\d+)/)
                        return match ? parseInt(match[1]) : -1
                      }).filter(i => i !== -1)
                    )
                    setSelected(indices)
                  }}
                  onFilesAdded={async (paths) => {
                    const expanded = await window.api.expandPaths(paths)
                    if (expanded && expanded.length) {
                      addFiles(expanded)
                      toast.success(`📁 Добавлено ${expanded.length} файлов`, {
                        duration: 3000,
                        style: { background: 'var(--bg-success)', color: 'var(--text-success)' }
                      })
                    }
                  }}
                  sortable={true}
                  />
                </div>
              </animated.div>
            )}

            {active==='ready' && (
              <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-4">
                {!!results.length && (
                  <div ref={resultsGridRef} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 @container">
                    {results.map((r, i) => (
                      <div key={r.out+i} className="group rounded-md overflow-hidden border border-white/5 relative cursor-pointer bg-white/70 dark:bg-slate-900/60">
                        <div className="h-36 flex items-center justify-center overflow-hidden relative bg-slate-200 dark:bg-slate-900">
                          <img loading="lazy" decoding="async" alt="result" className="max-h-36 transition-transform group-hover:scale-[1.1]" src={toFileUrl(r.out)} />
                          <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 flex items-center justify-center gap-2 pointer-events-none">
                            <button className="chip pointer-events-auto bg-blue-600/90 hover:bg-blue-500" onClick={(e)=>{ e.stopPropagation(); setPreviewSrc(toFileUrl(r.out)); setPreviewOpen(true) }}>
                              <FaEye className="w-3 h-3 mr-1" />
                              {t('common.preview')||'Preview'}
                            </button>
                            <button className="chip pointer-events-auto bg-purple-600/90 hover:bg-purple-500" onClick={async (e)=>{ e.stopPropagation(); try { const meta = await window.api.metaBeforeAfter(r.src, r.out); const a = await window.api.fileStats(r.out); const b = await window.api.fileStats(r.src); setMetaPayload({ meta, afterStats: a, beforeStats: b }); setMetaOpen(true) } catch {} }}>
                              <FaInfoCircle className="w-3 h-3 mr-1" />
                              Metadata
                            </button>
                            <button className="chip pointer-events-auto bg-green-600/90 hover:bg-green-500" onClick={(e)=>{ e.stopPropagation(); window.api.openPath(r.out) }}>
                              <FaFolder className="w-3 h-3 mr-1" />
                              {t('common.open')||'Open'}
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={r.out}>
                          <span className="flex-1 truncate">{r.out}</span>
                          <button className="btn btn-violet text-[10px]" onClick={()=>window.api.openPath(r.out)}>
                            <FaFolder className="w-3 h-3 mr-1" />
                            {t('common.open')||'Open'}
                          </button>
                          <button className="btn btn-amber text-[10px]" onClick={()=>window.api.showInFolder(r.out)}>
                            <FaFolderOpen className="w-3 h-3 mr-1" />
                            {t('common.folder')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!results.length && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="rounded-md overflow-hidden border border-white/5 bg-white/60 dark:bg-slate-900/50 animate-pulse">
                        <div className="h-36 bg-slate-300/60 dark:bg-slate-800" />
                        <div className="p-2">
                          <div className="h-3 w-4/5 bg-slate-300/60 dark:bg-slate-800 rounded mb-1" />
                          <div className="h-3 w-2/5 bg-slate-300/60 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </animated.div>
            )}
          </section>
        </div>

        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={()=>setPreviewOpen(false)} />
            <div className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-white dark:bg-slate-900">
              <img alt="preview" src={previewSrc} className="max-w-[90vw] max-h-[90vh]" />
              <button onClick={()=>setPreviewOpen(false)} className="btn btn-ghost absolute top-2 right-2 text-xs">
                Close
              </button>
            </div>
          </div>
        )}

        {metaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={()=>setMetaOpen(false)} />
            <div className="relative w-[860px] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <FaInfoCircle className="w-4 h-4 text-purple-400" />
                  Metadata Before / After
                </div>
                <button onClick={()=>setMetaOpen(false)} className="btn btn-ghost text-xs">
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs overflow-auto max-h-[75vh]">
                <div>
                  <div className="font-semibold mb-1 text-red-400">Before</div>
                  <pre className="border border-white/10 rounded p-2 whitespace-pre-wrap break-words bg-slate-100/80 text-slate-900 dark:bg-slate-950/60 dark:text-slate-100">{JSON.stringify({
                    ...(metaPayload?.meta?.before||{}),
                    sizeBytes: metaPayload?.beforeStats?.stats?.sizeBytes || 0
                  }, null, 2)}</pre>
                </div>
                <div>
                  <div className="font-semibold mb-1 text-green-400">After</div>
                  <pre className="border border-white/10 rounded p-2 whitespace-pre-wrap break-words bg-slate-100/80 text-slate-900 dark:bg-slate-950/60 dark:text-slate-100">{JSON.stringify({
                    ...(metaPayload?.meta?.after||{}),
                    sizeBytes: metaPayload?.afterStats?.stats?.sizeBytes || 0
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <TemplateManager
        isOpen={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
        templates={customTemplates}
        onSave={saveTemplate}
        onDelete={deleteTemplate}
        onApply={applyCustomTemplate}
        currentSettings={getCurrentSettings()}
      />

      {mobileSyncOpen && (
        <MobileSync
          onClose={() => setMobileSyncOpen(false)}
          onFilesReceived={(paths) => {
            addFiles(paths)
            toast.success(`📱 Получено ${paths.length} фото с телефона`, {
              duration: 3000,
              style: { background: 'var(--bg-success)', color: 'var(--text-success)' }
            })
          }}
        />
      )}

    </Suspense>
  )
}