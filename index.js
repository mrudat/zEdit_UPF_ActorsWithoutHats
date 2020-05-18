/* global xelib, registerPatcher, patcherUrl, info */

const {
  GetElement,
  GetGlobal,
  GetValue,
  GetIntValue,
  gmFO4,
  gmSSE,
  gmTES5,
  RemoveElement,
  SetIntValue,
  HasKeyword
} = xelib

function flagsToBitmap (flags) {
  return (flags
    .map((v) => (1 << parseInt(v) - 30))
    .reduce((a, v) => a | v, 0)) >>> 0
}

const flagData = [
  {
    gameModes: new Set(['SSE', 'TES5']),
    coveringFlags: [
      '30 - Head',
      '31 - Hair',
      '41 - LongHair',
      '43 - Ears'
    ],
    headFlag: '42 - Circlet',
    skipFlags: [],
    filterRace: () => true
  },
  {
    gameModes: new Set(['FO4']),
    coveringFlags: [
      '31 - Hair Long',
      '32 - FaceGen Head',
      '47 - Eyes',
      '48 - Beard',
      '49 - Mouth',
      '52 - Scalp'
    ],
    headFlag: '30 - Hair Top',
    skipFlags: [
      '33 - BODY', // eg. hazmat suit
      // torso armor with integrated helmet, eg. "Super Mutant Bearskin Outfit" from Far Harbor
      '36 - [U] Torso'
    ],
    skipKeywords: [
      // It is not possible to have an invisible Power Armor Helmet, as power armor helmet detection uses one of the slots we would need to remove.
      'ArmorTypePower [KYWD:0004D8A1]'
    ],
    filterRace: (record) => GetValue(record, 'RNAM') === 'HumanRace "Human" [RACE:00013746]'
  }
]

let appName = null
let headFlag = 0
let coveringFlags = 0
let removeFlagsMask = 0
let skipFlags = 0xFFFF
let skipKeywords = []
let filterRace = () => true

function getBodyTemplate (record) {
  return GetElement(record, 'BODT') || GetElement(record, 'BOD2')
}

registerPatcher({
  info: info,
  gameModes: [
    gmFO4,
    gmSSE,
    gmTES5
  ],
  settings: {
    label: info.name,
    templateUrl: `${patcherUrl}/partials/settings.html`,
    defaultSettings: {
      patchFileName: 'zPatch.esp'
    }
  },
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: function (patchFile, helpers, settings, locals) {
      appName = GetGlobal('AppName')

      for (const data of flagData) {
        const gameModes = data.gameModes
        if (gameModes.has(appName)) {
          headFlag = flagsToBitmap([data.headFlag])
          coveringFlags = flagsToBitmap(data.coveringFlags)
          removeFlagsMask = ~coveringFlags
          skipFlags = flagsToBitmap(data.skipFlags)
          skipKeywords = data.skipKeywords
          filterRace = data.filterRace
          break
        }
      }
    },
    process: [
      {
        load: {
          signature: 'ARMO',
          filter: function (armo) {
            const bodt = getBodyTemplate(armo)
            if (!bodt) return false

            const flags = GetIntValue(bodt, 'First Person Flags')

            if (!(flags & headFlag)) return false
            if (flags & skipFlags) return false
            if (!(flags & coveringFlags)) return false

            if (!filterRace(armo)) return false

            for (const keyword of skipKeywords) {
              if (HasKeyword(armo, keyword)) return false
            }
            return true
          }
        },
        patch: function (armo, helpers, settings, locals) {
          const bodt = getBodyTemplate(armo)

          SetIntValue(bodt, 'First Person Flags', GetIntValue(bodt, 'First Person Flags') & removeFlagsMask)

          switch (appName) {
            case 'TES5':
            case 'SSE':
              RemoveElement(armo, 'Armature')
              break
            case 'FO4':
              RemoveElement(armo, 'Models')
              break
          }
        }
      }
    ]
  })
})
