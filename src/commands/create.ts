import cli from 'cli-ux'
// @ts-ignore
import {ncp} from 'ncp'
import * as path from 'path'
// @ts-ignore
import * as writePkgJson from 'write-pkg'

import Base from '../base'
import conf from '../services/conf'
import {logger} from '../services/logger'
import npm from '../services/npm'
import render from '../services/render'
import _ from '../util'

export default class Create extends Base {
  static description = 'create a rde project'

  static examples = [
    '$ rde create <appname>',
  ]

  static args = [{
    name: 'appName',
    required: false,
    description: 'package name, used by package.json',
  }]

  private appName = ''

  private rdtName = ''

  public async preInit() {
    const {args} = this.parse(Create)

    if (!_.isEmptyDir(process.cwd())) {
      logger.error('Not an empty directory, please check')
      this.exit(1)
    }

    return args
  }

  public async initialize(args: any) {
    this.appName = args.appName || path.basename(process.cwd())

    await this.prompt()

    logger.info(`Installing ${this.rdtName}. This might take a while...`)
    await writePkgJson({name: this.appName})

    await npm.install(this.rdtName)

    const appConfName = conf.getAppConfName()
    await render.renderTo(appConfName.slice(0, -3), {
      templateName: this.rdtName,
    }, appConfName)

    const {template} = conf.getRdtConf()
    const {app} = conf.getAppConf()

    app.readme.template = template.docs.homepage
    await render.renderTo('module', {
      obj: app
    }, appConfName)
  }

  async run() {
    const cwd = process.cwd()
    const srcDir = conf.getRdtAppDir()
    const destDir = path.resolve(cwd, 'app')

    await ncp(srcDir, destDir)
  }

  public async postRun() {
    logger.complete('Created project')
    logger.star('Start with command:')
    logger.star('$ rde run dev')
  }

  private async prompt() {
    const defaultRdt = 'vuecli-basic'

    this.rdtName = await cli.prompt(`template name: (${defaultRdt})`, {
      required: false,
      default: defaultRdt,
    })

    if (!this.rdtName.includes('rdt-')) {
      this.rdtName = `rdt-${this.rdtName}`
    }

    try {
      await npm.getInfo(this.rdtName)
    } catch ({response, message}) {
      if (response.status === 404) {
        logger.error(`Cannot find ${this.rdtName}, please check`)
      } else {
        logger.error(message)
      }
      this.exit(1)
    }
  }
}