/*jshint esversion:6*/
const sixInputBlender = {
    title:"sixInputBlender",
    description:"equal weight blender for 6 inputs",
    vertexShader:`
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(vec2(2.0,2.0)*a_position-vec2(1.0, 1.0), 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
    `,
    fragmentShader:`
        precision mediump float;
        uniform sampler2D u_image1;
        uniform sampler2D u_image2;
        uniform sampler2D u_image3;
        uniform sampler2D u_image4;
        uniform sampler2D u_image5;
        uniform sampler2D u_image6;     
        varying vec2 v_texCoord;

        void main()
        {
            
            vec4 col1 = texture2D(u_image1,v_texCoord);
            vec4 col2 = texture2D(u_image2,v_texCoord);
            vec4 col3 = texture2D(u_image3,v_texCoord);
            vec4 col4 = texture2D(u_image4,v_texCoord);
            vec4 col5 = texture2D(u_image5,v_texCoord);
            vec4 col6 = texture2D(u_image6,v_texCoord);

            bvec3 isBlank1 = equal(col1.xyz,vec3(0.0));
            bvec3 isBlank2 = equal(col2.xyz,vec3(0.0));
            bvec3 isBlank3 = equal(col3.xyz,vec3(0.0));
            bvec3 isBlank4 = equal(col4.xyz,vec3(0.0));
            bvec3 isBlank5 = equal(col5.xyz,vec3(0.0));
            bvec3 isBlank6 = equal(col6.xyz,vec3(0.0));

            if(isBlank1.x&&isBlank1.y&&isBlank1.z){
                col1 = vec4(0.5,0.5,0.5,1.0);
            }

            if(isBlank2.x&&isBlank2.y&&isBlank2.z){
                col2 = vec4(0.5,0.5,0.5,1.0);
            }

            if(isBlank3.x&&isBlank3.y&&isBlank3.z){
                col3 = vec4(0.5,0.5,0.5,1.0);
            }

            if(isBlank4.x&&isBlank4.y&&isBlank4.z){
                col4 = vec4(0.5,0.5,0.5,1.0);
            }

            if(isBlank5.x&&isBlank5.y&&isBlank5.z){
                col5 = vec4(0.5,0.5,0.5,1.0);
            }

            if(isBlank6.x&&isBlank6.y&&isBlank6.z){
                col6 = vec4(0.5,0.5,0.5,1.0);
            }


            float adjuster = pow(2.0,6.0)/2.0;          
            vec4 col = col1*col2*col3*col4*col5*col6*adjuster;
            //vec4 col = col1*col2*2.0;

            // Output to screen
            gl_FragColor = col;
        }
    `,
    properties:{},
    inputs:['u_image1','u_image2','u_image3','u_image4','u_image5','u_image6']
};

const testEffectDescription = {
    title:"test",
    description: "Change images to a single chroma (e.g can be used to make a black & white filter). Input color mix and output color mix can be adjusted.",
    vertexShader : `        
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        // ^^ attribute is vertex shader only, its user defined data input,
        // in raw webgl data is fed using buffer object (as in webgl_trial.js)
        varying vec2 v_texCoord;
        // in recent versions of glsl, varying == output of vertexShader && input of fragment shader.
        // so it looks its used to pass data between shaders
        void main() {
            gl_Position = vec4(vec2(2.0,2.0)*a_position-vec2(1.0, 1.0), 0.0, 1.0); // <- normalizing
            // since clip space goes from -1.0 to 1.0, and our u_image dims are 0.0 to 1.0 on both axis
            // we multiply both xy by 2.0 and move both by -1.0
            v_texCoord = a_texCoord;
        }`,
    fragmentShader : `
        precision mediump float;
        uniform sampler2D u_image;
        uniform vec3 inputMix;
        uniform vec3 outputMix;
        varying vec2 v_texCoord;
        varying float v_mix;
        void main(){
            vec4 color = texture2D(u_image, v_texCoord);
            float mono = color[0]*inputMix[0] + color[1]*inputMix[1] + color[2]*inputMix[2];
            color[0] = mono * outputMix[0];
            color[1] = mono * outputMix[1];
            color[2] = mono * outputMix[2];
            gl_FragColor = color;
        }`,
    properties:{
        "inputMix":{type:"uniform", value:[0.4,0.6,0.2]},
        "outputMix":{type:"uniform", value:[1.0,1.0,1.0]}
    },
    inputs:["u_image"]
};

const invertColEffectDescription = {
    title:"invert Colours",
    description: "Inverts colors of an image",
    vertexShader:`
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main(){
            gl_Position = vec4(vec2(2.0,2.0)*a_position-vec2(1.0,1.0),0.0,1.0);
            v_texCoord = a_texCoord;
        }
    `,
    fragmentShader:`
        precision mediump float;
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        void main(){
            vec4 color = texture2D(u_image, v_texCoord);
            color[0] = 1.0 - color[0];
            color[1] = 1.0 - color[1];
            color[2] = 1.0 - color[2];
            gl_FragColor = color;
        }
    `,
    properties:{},
    inputs:["u_image"]
};

module.exports = {
    testEffectDescription,
    invertColEffectDescription,
    sixInputBlender
};