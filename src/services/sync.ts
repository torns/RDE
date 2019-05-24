import * as path from 'path'
import * as writePkg from 'write-pkg'

import conf from '../services/conf'
import docker from '../services/docker'

import render from './render'

const {resolve, join} = path
const {RdTypes, cwd, rdcConfName} = conf

class Sync {
  public get appConf(): AppConf {
    return require(resolve(conf.cwd, conf.appConfName))
  }

  public get from() {
    if (conf.isApp) {
      const {container} = conf.getAppConf()
      return container.name
    }

    if (conf.rdType === RdTypes.Container) {
      const rdcConfPath = resolve(cwd, rdcConfName)
      const rdcConf = require(rdcConfPath)

      return rdcConf.nodeVersion || 'node:latest'
    }
  }

  public get ports() {
    if (conf.isApp) {
      const {docker} = conf.getAppConf()
      return docker.ports || []
    }

    if (conf.rdType === RdTypes.Container) {
      const rdcConf = require(join(conf.cwd, conf.rdcConfName))

      return rdcConf.docker.ports || []
    }
  }

  public async all({watch, cmd}) {
    await docker.genDockerFile(
      conf.dockerWorkDirRoot,
      this.from,
      conf.localCacheDir,
      conf.isApp,
    )

    // TODO: docker-compose.yml 支持 默认 与 rdc 提供的 合并
    await docker.genDockerCompose(
      conf.dockerWorkDirRoot,
      cmd,
      this.ports,
      watch,
      `dev-${conf.tag}`,
      conf.localCacheDir,
      conf.isApp,
      cmd === 'build'
    )

    if (conf.isApp) {
      await this.create()

      await this.genDevcontainer()
    }
  }

  public async genDevcontainer() {
    const localCacheRdcConf = require(resolve(cwd, conf.localCacheDir, conf.rdcConfName))

    const devcontainerMap = {
      devcontainer: 'devcontainer.json',
      'docker-compose': 'docker-compose.yml',
      Dockerfile: 'Dockerfile',
    }
    for (let [key, value] of Object.entries(devcontainerMap)) {
      await render.renderTo(`devcontainer/${key}`, {
        tag: conf.tag,
        workDir: conf.dockerWorkDirRoot,
        extensions: localCacheRdcConf.extensions || [],
        from: this.from,
        ports: this.ports,
        mappings: localCacheRdcConf.mappings
      }, value, {
        overwrite: true,
      })
    }
  }

  public async create(rdc = null) {
    /**
     * 1. copy rdc/package.json to .cache/package.json
     * 2. copy rdc/rdc.config.js to .cache/rdc.config.js
     * 3. add suite to pkg.json
     */
    const {
      cwd,
      runtimeDir,
      rdcConfName,
      dockerWorkDirRoot,
      localCacheDir,
    } = conf

    // only create application will pass rdc param
    if (!rdc) {
      rdc = this.appConf.container.name
    }
    const name = rdc.split(':')[0]
    const rdcPathInDock = resolve(dockerWorkDirRoot, name)
    await docker.copy(rdc, [{
      from: resolve(rdcPathInDock, runtimeDir, 'package.json'),
      to: localCacheDir,
    }, {
      from: resolve(rdcPathInDock, rdcConfName),
      to: localCacheDir,
    }])

    const runtimePkgJson = require(resolve(cwd, localCacheDir, 'package.json'))

    this.appConf.suites.map(item => {
      runtimePkgJson.dependencies = runtimePkgJson.dependencies || {}
      runtimePkgJson.dependencies[item.name] = item.version
    })
    await writePkg(resolve(localCacheDir), runtimePkgJson)
  }
}
export default new Sync()
