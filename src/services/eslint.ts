import * as npmWhich from 'npm-which'
import * as path from 'path'

import _ from '../util'

import conf from './conf'
import npm from './npm'
import render from './render'

export default {
  async installEslintExtends(eslintrcPath) {
    const eslintrc = _.ensureRequire(eslintrcPath)
    let eslintDevs = ['eslint', 'babel-eslint']
    if (eslintrc.plugins) {
      typeof eslintrc.plugins === 'string' ?
        eslintDevs.push(this.getValidPluginName(eslintrc.plugins)) :
        eslintrc.plugins.forEach(item => eslintDevs.push(this.getValidPluginName(item)))
    }
    if (eslintrc.extends) {
      typeof eslintrc.extends === 'string' ?
        eslintDevs.push(this.getValidConfigName(eslintrc.extends)) :
        eslintrc.extends.forEach(item => eslintDevs.push(this.getValidConfigName(item)))
    }
    eslintDevs = [...new Set(eslintDevs)]

    await npm.install(`${eslintDevs.join(' ')} -g`)
  },

  async renderDir(isRda) {
    const join = path.join
    let eslintBinPath = ''
    try {
      eslintBinPath = npmWhich(conf.cwd).sync('eslint')
    } catch (err) {
      if (err) {
        eslintBinPath = ''
      }
    }

    const eslintLibPath = eslintBinPath.replace(join('bin', 'eslint'), join('lib', 'node_modules', 'eslint'))
    const eslintrcPath = isRda ? '.cache/.eslintrc.js' : 'template/.eslintrc.js'
    await render.renderDir(path.resolve(__dirname, '..' , 'mustaches', 'eslint'), {
      eslintLibPath,
      eslintrcPath
    }, ['.xml', '.json'], conf.cwd, {
      overwrite: true
    })
  },

  getValidPluginName(plugin) {
    if (plugin.includes('eslint-plugin-')) {
      return plugin
    }
    return `eslint-plugin-${plugin}`
  },

  getValidConfigName(name) {
    if (name.includes('eslint-config-')) {
      return name.split('/')[0]
    }
    if (name.includes('eslint:')) {
      return ''
    }
    if (name.includes('plugin:')) {
      const plugin = name.split(':')[1].split('/')[0]
      return this.getValidPluginName(plugin)
    }
    return `eslint-config-${name.split('/')[0]}`
  }
}