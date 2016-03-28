/**
 * Copyright (c) 2016 Hongchan Choi. MIT License.
 *
 * Canopy Project Gulp File.
 */
var gulp        = require('gulp');
var plugins     = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var del         = require('del');
var browserSync = require('browser-sync').create();
var deploy      = require('gulp-gh-pages');


// serve: launch local dev server.
gulp.task('serve', function () {
  browserSync.init({
    server: {
      baseDir: 'app'
    },
    notify: false
  });

  gulp.watch([
    'app/index.html',
    'app/assets/**/*',
    'bower_components/spiral-audiograph/**/*',
    'bower_components/spiral-code/**/*',
    'bower_components/spiral-gistloader/**/*',
    'bower_components/spiral-minimap/**/*',
    'bower_components/spiral-waveform/**/*',
  ], browserSync.reload);
});


// deploy: deploy current build to the gh-pages branch.
gulp.task('deploy', function () {
  return gulp.src('app/**/*')
    .pipe(deploy());
});


// clean: clean the deploy residue.
gulp.task('clean', function () {
  del('.publish/');
});


// publish: deploy and clean.
gulp.task('publish', function (callback) {
  runSequence('deploy', 'clean', callback);
});
