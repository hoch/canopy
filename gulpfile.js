var gulp        = require('gulp'),
    plugins     = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    del         = require('del');

var browserSync = require('browser-sync').create();
var deploy      = require('gulp-gh-pages');

gulp.task('serve', function () {

  browserSync.init({
    server: {
      baseDir: 'app'
    },
    notify: false
  });

  gulp.watch([
    'app/*.html',
    'app/js/*.js',
    'app/css/*.css',
    '!app/codemirror/**/*'
  ], browserSync.reload);
});


// gh-pages integration
gulp.task('deploy', function () {
  return gulp.src('app/**/*')
    .pipe(deploy());
});


gulp.task('default', function (cb) {
  runSequence('serve', cb);
});