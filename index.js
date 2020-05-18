/* eslent-env node */
/* global xelib, registerPatcher, patcherUrl, info */

const {
  GetElement,
  GetEnabledFlags,
  GetFormID,
  LongName,
  SetFlag,
  RemoveElement
} = xelib

const coveringFlags = [
  '30 - Head',
  '31 - Hair',
  '41 - LongHair',
  '43 - Ears'
]

function getBodyTemplate (record) {
  return GetElement(record, 'BODT') || GetElement(record, 'BOD2')
}

registerPatcher({
  info: info,
  gameModes: [xelib.gmTES5, xelib.gmSSE],
  settings: {
    label: 'Actors Without Hats',
    templateUrl: `${patcherUrl}/partials/settings.html`,
    defaultSettings: {
      patchFileName: 'zPatch.esp'
    }
  },
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: function () {
      // const arma = helpers.loadRecords('ARMA')

      locals.armoPatchData = new Map()
    },
    process: [
      {
        load: {
          signature: 'ARMO',
          filter: function (armo) {
            if (!xelib.IsWinningOverride(armo)) return false

            const bodt = getBodyTemplate(armo)
            if (!bodt) return false

            const flags = new Set(GetEnabledFlags(bodt, 'First Person Flags'))

            if (!flags.has('42 - Circlet')) return false

            const flagsToRemove = []

            for (const flag of coveringFlags) {
              if (flags.has(flag)) {
                flagsToRemove.push(flag)
              }
            }
            if (flagsToRemove.length) {
              locals.armoPatchData.set(GetFormID(armo), flagsToRemove)
              return true
            }

            return false
          }
        },
        patch: function (armo) {
          helpers.logMessage(`Patching ${LongName(armo)}`)

          const flagsToRemove = locals.armoPatchData.get(GetFormID(armo))

          const bodt = getBodyTemplate(armo)

          for (var i = 0; i < flagsToRemove.length; i++) {
            SetFlag(bodt, 'First Person Flags', flagsToRemove[i], false)
          }

          RemoveElement(armo, 'Armature')
        }
      }
    ]
  })
})
