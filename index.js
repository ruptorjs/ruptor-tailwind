import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const cjsConfig = 'tailwind.config.cjs';
const jsConfig = 'tailwind.config.js';

let cssFile = null;
let cssCompiledFile = null;
let cssCompiledFilename = null;
let log = null;
let fs = null;
let path = null;
let isExporting = false;
let projectRoot = null;
let componentsDir = undefined;
let pagesDir = undefined;
let injectToHead = null;
let lastCompiledCSS = '';



export async function initExport() {
  isExporting = true;
}


export async function init({request, head, log: _log, watch, util}) {
  log = _log;
  fs = util.fs;
  path = util.path;
  cssCompiledFilename = isExporting ? 'style.css' : 'style.dev.css';  
  
  const cssCompiledURL = await request('asset', cssCompiledFilename);
  const project = await request('project');
  const extensionOptions = await request('extensionOptions');
  
  componentsDir = project.componentsDir;
  pagesDir = project.pagesDir;
  projectRoot = project.rootDir;
  cssFile = path.join(project.rootDir, 'tailwind.css');
  cssCompiledFile = path.join(isExporting ? project.exportAssetsDir : project.assetsDir, cssCompiledFilename);
  
  injectToHead = () => head('link', {rel: 'stylesheet', href: cssCompiledURL}, undefined, extensionOptions?.pageFilter);
  injectToHead();
  
  if (!isExporting) {
    await compile();
    if (cssCompiledFilename !== 'style.css') {
      watch(path.join(projectRoot, cjsConfig), () => compile());
      watch(path.join(projectRoot, jsConfig), () => compile());
      watch(componentsDir, ({path: filePath}) => filePath.endsWith('.svelte') && compile());
      watch(pagesDir, ({path: filePath}) => {(filePath.endsWith('.md') || filePath.endsWith('.html')) && compile()});
      watch(cssFile, () => compile());
    }
  }
}

export async function afterExport({request}) {
  const project = await request('project');
  let config = {};
  try {
    const configFile = await getConfigFile();
    const configModule = await import(configFile);
    config = configModule.default;
  } catch (error) {
  }
  
  config.mode = 'jit';
  config.purge = [
    project.exportDir + '/**/*.html',
    project.exportDir + '/**/*.js',
  ];
  
  await compile(config);
}

function compile(config = undefined) {
  return new Promise(async (resolve, reject) => {
    let css = '';
    try {
      css = await fs.readFile(cssFile, 'utf8');
    } catch (error) {
      // Create basic tailwind css file if it doesn't already exist
      css = '@tailwind base;@tailwind components;@tailwind utilities;';
    }
    
    if (!config) {
      config = await getConfigFile() || undefined;
      if (config) {
        try {
          // CJS bust cache by deleting require.cache object
          if (config.endsWith('.cjs')) {
            delete require.cache[config];
            config = require(config);
          } 
          
          // ESM bust cache by appending timestamp
          else {
            const configModule = await import(config + '?' + Date.now());
            config = configModule.default || undefined;
          }

        } catch (error) {
          console.log(error)
        }
      }
      
      // Make sure config is set
      config = config || {};
      
      // Append a new date to config to force Tailwind JIT to recompile and parse all files
      config._ = Date.now();
      config.mode = 'jit';
      config.purge = [
        componentsDir + '/**/*.svelte',
        pagesDir + '/**/*.html',
        pagesDir + '/**/*.md',
      ]
    }
    
    postcss([tailwind({config})])
      .process(css, {from: undefined})
      .then(async result => {
        if (result.css !== lastCompiledCSS) {
          lastCompiledCSS = result.css;
          log(`Writing ${cssCompiledFilename}`);
          await fs.outputFile(cssCompiledFile, result.css);
          injectToHead();
        }
        resolve({css: result.css});
      }).catch(e => {
        console.error(e)
      })
  });
}

async function getConfigFile() {
  // .js then .cjs
  let file = path.join(projectRoot, jsConfig);
  if (await fs.pathExists(file)) { return file }
  file = path.join(projectRoot, cjsConfig);
  if (await fs.pathExists(file)) { return file }
  return null;
}