const inlineRule = /^(?:\${1,2}(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\${1,2}(?=[\s?!.,:？！。，：]|$)|\\\(((?:\\.|[^\\\n])*?(?:\\.|[^\\\n]))\\\))/
const inlineRuleNonStandard = /^(?:\${1,2}(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\${1,2}|\\\(((?:\\.|[^\\\n])*?(?:\\.|[^\\\n]))\\\))/

const blockRule = /^[^\S\r\n]*((\${1,2})\n((?:\\[\s\S]|[^\\])+?)\n\2|\\\[((?:\\[\s\S]|[^\\])+?)\\\])[^\S\r\n]*(?:\n|$)/

function createRenderer(display) {
  return (token) => {
    window.MathJax.texReset()
    const mjxContainer = window.MathJax.tex2svg(token.text, { display })
    const svg = mjxContainer.firstChild
    const width = svg.style[`min-width`] || svg.getAttribute(`width`)
    svg.removeAttribute(`width`)
    svg.style = `max-width: 300vw !important;`
    svg.style.width = width
    svg.style.display = `initial`
    if (display) {
      return `<section style="text-align: center; overflow: auto;">${svg.outerHTML}</section>`
    }
    return `<span style="vertical-align: middle; line-height: 1;">${svg.outerHTML}</span>`
  }
}

function inlineBlockKatex(options, renderer) {
  const ruleReg = blockRule
  return {
    name: `inlineBlockKatex`,
    level: `inline`,
    start(src) {
      let index
      let indexSrc = src

      while (indexSrc) {
        const bracketIndex = indexSrc.indexOf(`\\[`)

        if (bracketIndex === -1)
          return
        index = bracketIndex

        const f = index === 0 || indexSrc.charAt(index - 1) === ` `
        if (f) {
          const possibleKatex = indexSrc.substring(index)
          if (possibleKatex.match(ruleReg)) {
            return index
          }
        }

        indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, ``)
      }
    },
    tokenizer(src) {
      const match = src.match(ruleReg)
      if (match) {
        return {
          type: `blockKatex`,
          raw: match[0],
          text: (match[4]).trim(),
          displayMode: true,
        }
      }
    },
    renderer,
  }
}

function inlineKatex(options, renderer) {
  const nonStandard = options && options.nonStandard
  const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule
  return {
    name: `inlineKatex`,
    level: `inline`,
    start(src) {
      let index
      let indexSrc = src

      while (indexSrc) {
        const dollarIndex = indexSrc.indexOf(`$`)
        const bracketIndex = indexSrc.indexOf(`\\(`)

        if (dollarIndex === -1 && bracketIndex === -1)
          return
        index = (dollarIndex === -1)
          ? bracketIndex
          : (bracketIndex === -1)
              ? dollarIndex
              : Math.min(dollarIndex, bracketIndex)

        const f = nonStandard ? index > -1 : index === 0 || indexSrc.charAt(index - 1) === ` `
        if (f) {
          const possibleKatex = indexSrc.substring(index)
          if (possibleKatex.match(ruleReg)) {
            return index
          }
        }

        indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, ``)
      }
    },
    tokenizer(src) {
      const match = src.match(ruleReg)
      if (match) {
        const isBracket = match[0].startsWith(`\\(`)
        return {
          type: `inlineKatex`,
          raw: match[0],
          text: (isBracket ? match[2] : match[1]).trim(),
          displayMode: !isBracket && match[0].startsWith(`$$`),
        }
      }
    },
    renderer,
  }
}

function blockKatex(options, renderer) {
  return {
    name: `blockKatex`,
    level: `block`,
    tokenizer(src) {
      const match = src.match(blockRule)
      if (match) {
        const isDollar = match[2]?.startsWith(`$`)
        return {
          type: `blockKatex`,
          raw: match[0],
          text: (isDollar ? match[3] : match[4]).trim(),
          displayMode: true,
        }
      }
    },
    renderer,
  }
}

export function MDKatex(options = {}) {
  return {
    extensions: [
      inlineKatex(options, createRenderer(false)),
      blockKatex(options, createRenderer(true)),
      inlineBlockKatex(options, createRenderer(true)),
    ],
  }
}
