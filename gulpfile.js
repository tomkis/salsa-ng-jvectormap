var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    minifyCss = require('gulp-minify-css');


gulp.task('browserify', function() {
  gulp.src('src/NgGeoChart.js')
    .pipe(browserify())
    .pipe(uglify())
    .pipe(rename({
      basename: 'salsa-ng-jvectormap',
      suffix: '.min',
      exname: 'js'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('css', function() {
  gulp.src(['src/jquery-jvectormap/jquery-jvectormap-2.0.1.css', 'src/style.css'])
    .pipe(minifyCss())
    .pipe(concat('style.css'))
    .pipe(rename({
      basename: 'salsa-ng-jvectormap',
      suffix: '.min',
      exname: 'css'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('build', ['browserify', 'css']);
gulp.task('default', ['build']);