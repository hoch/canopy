/**
 * @license MIT License. Copyright (c) 2015 - 2016 Hongchan Choi.
 * @fileOverview Canopy Project Gulp File.
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
    'app/*.html',
    'spiral-elements/spiral-audiograph/**/*',
    'spiral-elements/spiral-code/**/*',
    'spiral-elements/spiral-gistloader/**/*',
    'spiral-elements/spiral-minimap/**/*',
    'spiral-elements/spiral-waveform/**/*',
  ], browserSync.reload);
});


// deploy: deploy current build to the gh-pages branch.
gulp.task('deploy', function () {
  return gulp.src('app/**/*')
    .pipe(deploy({
      'remoteUrl' : 'git@github.com:hoch/canopy.git'
    }));
});


// clean: clean the deploy residue.
gulp.task('clean', function () {
  del('.publish/');
});


// publish: deploy and clean.
gulp.task('publish', function (callback) {
  runSequence('deploy', 'clean', callback);
});
