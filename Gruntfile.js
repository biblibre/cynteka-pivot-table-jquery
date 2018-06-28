module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            target: {
                options: {
                    sourceMap: true
                },
                files: {
                    'dist/jquery.cy-pivot.min.js': ['js/jquery.cy-pivot.js']
                }
            }
        },

        cssmin: {
            target: {
                files: {
                    'dist/jquery.cy-pivot.min.css': ['css/jquery.cy-pivot.css']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', [
        'cssmin',
        'uglify'
    ]);
};
