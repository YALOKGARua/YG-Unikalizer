import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProfileKind = 'camera' | 'phone' | 'drone' | 'scanner' | 'custom'
type DateStrategyKind = 'now' | 'offset'

interface MetaSettingsState {
  removeGps: boolean
  uniqueId: boolean
  removeAll: boolean
  softwareTag: boolean
  fake: boolean
  fakeProfile: ProfileKind
  fakeMake: string
  fakeModel: string
  fakeLens: string
  fakeSoftware: string
  fakeSerial: string
  fakeGps: boolean
  fakeLat: string
  fakeLon: string
  fakeAltitude: string
  fakeAuto: boolean
  fakePerFile: boolean
  fakeIso: number | ''
  fakeExposureTime: string
  fakeFNumber: number | ''
  fakeFocalLength: number | ''
  fakeExposureProgram: number | ''
  fakeMeteringMode: number | ''
  fakeFlash: number | ''
  fakeWhiteBalance: number | ''
  fakeColorSpace: string
  fakeRating: number | ''
  fakeLabel: string
  fakeTitle: string
  fakeCity: string
  fakeState: string
  fakeCountry: string
  dateStrategy: DateStrategyKind
  dateOffsetMinutes: number
  
  setRemoveGps: (v: boolean) => void
  setUniqueId: (v: boolean) => void
  setRemoveAll: (v: boolean) => void
  setSoftwareTag: (v: boolean) => void
  setFake: (v: boolean) => void
  setFakeProfile: (v: ProfileKind) => void
  setFakeMake: (v: string) => void
  setFakeModel: (v: string) => void
  setFakeLens: (v: string) => void
  setFakeSoftware: (v: string) => void
  setFakeSerial: (v: string) => void
  setFakeGps: (v: boolean) => void
  setFakeLat: (v: string) => void
  setFakeLon: (v: string) => void
  setFakeAltitude: (v: string) => void
  setFakeAuto: (v: boolean) => void
  setFakePerFile: (v: boolean) => void
  setFakeIso: (v: number | '') => void
  setFakeExposureTime: (v: string) => void
  setFakeFNumber: (v: number | '') => void
  setFakeFocalLength: (v: number | '') => void
  setFakeExposureProgram: (v: number | '') => void
  setFakeMeteringMode: (v: number | '') => void
  setFakeFlash: (v: number | '') => void
  setFakeWhiteBalance: (v: number | '') => void
  setFakeColorSpace: (v: string) => void
  setFakeRating: (v: number | '') => void
  setFakeLabel: (v: string) => void
  setFakeTitle: (v: string) => void
  setFakeCity: (v: string) => void
  setFakeState: (v: string) => void
  setFakeCountry: (v: string) => void
  setDateStrategy: (v: DateStrategyKind) => void
  setDateOffsetMinutes: (v: number) => void
}

export const useMetaSettingsStore = create<MetaSettingsState>()(
  persist(
    (set) => ({
      removeGps: true,
      uniqueId: true,
      removeAll: false,
      softwareTag: true,
      fake: false,
      fakeProfile: 'camera',
      fakeMake: '',
      fakeModel: '',
      fakeLens: '',
      fakeSoftware: '',
      fakeSerial: '',
      fakeGps: false,
      fakeLat: '',
      fakeLon: '',
      fakeAltitude: '',
      fakeAuto: true,
      fakePerFile: true,
      fakeIso: '',
      fakeExposureTime: '',
      fakeFNumber: '',
      fakeFocalLength: '',
      fakeExposureProgram: '',
      fakeMeteringMode: '',
      fakeFlash: '',
      fakeWhiteBalance: '',
      fakeColorSpace: '',
      fakeRating: '',
      fakeLabel: '',
      fakeTitle: '',
      fakeCity: '',
      fakeState: '',
      fakeCountry: '',
      dateStrategy: 'now',
      dateOffsetMinutes: 0,

      setRemoveGps: (v) => set({ removeGps: v }),
      setUniqueId: (v) => set({ uniqueId: v }),
      setRemoveAll: (v) => set({ removeAll: v }),
      setSoftwareTag: (v) => set({ softwareTag: v }),
      setFake: (v) => set({ fake: v }),
      setFakeProfile: (v) => set({ fakeProfile: v }),
      setFakeMake: (v) => set({ fakeMake: v }),
      setFakeModel: (v) => set({ fakeModel: v }),
      setFakeLens: (v) => set({ fakeLens: v }),
      setFakeSoftware: (v) => set({ fakeSoftware: v }),
      setFakeSerial: (v) => set({ fakeSerial: v }),
      setFakeGps: (v) => set({ fakeGps: v }),
      setFakeLat: (v) => set({ fakeLat: v }),
      setFakeLon: (v) => set({ fakeLon: v }),
      setFakeAltitude: (v) => set({ fakeAltitude: v }),
      setFakeAuto: (v) => set({ fakeAuto: v }),
      setFakePerFile: (v) => set({ fakePerFile: v }),
      setFakeIso: (v) => set({ fakeIso: v }),
      setFakeExposureTime: (v) => set({ fakeExposureTime: v }),
      setFakeFNumber: (v) => set({ fakeFNumber: v }),
      setFakeFocalLength: (v) => set({ fakeFocalLength: v }),
      setFakeExposureProgram: (v) => set({ fakeExposureProgram: v }),
      setFakeMeteringMode: (v) => set({ fakeMeteringMode: v }),
      setFakeFlash: (v) => set({ fakeFlash: v }),
      setFakeWhiteBalance: (v) => set({ fakeWhiteBalance: v }),
      setFakeColorSpace: (v) => set({ fakeColorSpace: v }),
      setFakeRating: (v) => set({ fakeRating: v }),
      setFakeLabel: (v) => set({ fakeLabel: v }),
      setFakeTitle: (v) => set({ fakeTitle: v }),
      setFakeCity: (v) => set({ fakeCity: v }),
      setFakeState: (v) => set({ fakeState: v }),
      setFakeCountry: (v) => set({ fakeCountry: v }),
      setDateStrategy: (v) => set({ dateStrategy: v }),
      setDateOffsetMinutes: (v) => set({ dateOffsetMinutes: v }),
    }),
    { name: 'meta-settings-storage' }
  )
)
