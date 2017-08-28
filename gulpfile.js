const gulp = require('gulp');
const gulpClean = require('gulp-clean');
const gulpRunSequence = require('run-sequence');
const inlineResources = require('./tools/inline-resources');
var typedoc = require('gulp-typedoc');


const PROJECT_ROOT = process.cwd();



function inlineResource() {
    inlineResources('./dist/**');
}

function cleanDistNodeModules(){
    gulp.src('dist/node_modules')
        .pipe(gulpClean(null));
}

function cleanDistSrc(){
    gulp.src('dist/src')
        .pipe(gulpClean(null));
}

function generateDoc(){
    gulp
        .src(['src/**/*.ts','!src/index.ts'])
        .pipe(typedoc({
            module: 'commonjs',
            target: 'es6',
            out: 'dist/docs/',
            name: 'Arlas Web Core'
        }));
}

gulp.task('build:clean-dist-node_modules', cleanDistNodeModules);
gulp.task('build:clean-dist-src', cleanDistSrc);
gulp.task('build:generatedoc', generateDoc);



gulp.task('build:release', function (done) {
    // Synchronously run those tasks.
    return gulpRunSequence(
        'build:clean-dist-node_modules',
        'build:clean-dist-src',
        'build:generatedoc',
        done
    );
});

gulp.task('default',['build:release']);
