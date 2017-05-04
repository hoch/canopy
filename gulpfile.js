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
      baseDir: 'docs'
    },
    notify: false
  });

  gulp.watch([
    'docs/*.html',
    'docs/js/*.js',
    'docs/spiral-elements/spiral-audiograph/**/*',
    'docs/spiral-elements/spiral-code/**/*',
    'docs/spiral-elements/spiral-gistloader/**/*',
    'docs/spiral-elements/spiral-minimap/**/*',
    'docs/spiral-elements/spiral-waveform/**/*',
  ], browserSync.reload);
});
