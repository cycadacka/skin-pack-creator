import SkinInfo from './skin-info.js';

(function() {
  /** @type {File[]} */
  let uploadedSkins = [];

  const uploadListener = (function() {
    const mainElement = document.getElementsByTagName('main')[0];
    const footerElement = mainElement.getElementsByTagName('footer')[0];
    const uploadElement = document.getElementById('upload-skin');

    return () => {
      for (let i = 0; i < uploadElement.files.length; i++) {
        uploadedSkins.push(uploadElement.files[i]);
  
        mainElement.insertBefore((function() {
          /** @type {SkinInfo}  */
          const element = document.createElement('skin-info');
          element.skin = URL.createObjectURL(uploadElement.files[i]);
          return element;
        })(), footerElement);
      }
    }
  })();
  
  const downloadListener = (function() {
    /** @return {string} */
    function generateUUID() {
      if (!crypto) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      } else {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      }
    }

    return () => {
      if (uploadedSkins.length == 0) {
        alert('No skins present in the skin pack.');
        return;
      }
  
      const zip = new JSZip();
      
      // manifest.json
      const manifestJSON = {
        format_version: 1,
        header: {
            name: document.querySelector('header > input').value,
            uuid: generateUUID(),
            version: [
                1,
                1,
                0
            ]
        },
        modules: [
            {
                type: 'skin_pack',
                uuid: generateUUID(),
                version: [
                    1,
                    1,
                    0
                ]
            }
        ]
      };
  
      if (manifestJSON.header.name.length <= 0) {
        alert('Skin pack has no name.');
        return;
      }
  
      zip.file('manifest.json', JSON.stringify(manifestJSON));
  
      // skins.json
      const skinsJSON = {
        geometry: 'skinpacks/skins.json',
        skins: [],
        serialize_name: 'SkinPackCreator',
        localization_name: 'SkinPackCreator'
      };
  
      // texts/en_US.lang
      let en_US = `skinpack.SkinPackCreator=${manifestJSON.header.name}\n\n`;
  
      /** @type {HTMLCollectionOf<SkinInfo>} */
      const skinInfo = document.getElementsByTagName('skin-info');
      
      for (let i = 0; i < uploadedSkins.length; i++) {
        if (skinInfo[i].name.length <= 0) {
          alert(`Skin ${i + 1} has no name.`);
          return;
        }

        skinsJSON.skins.push({
          localization_name: `Skin${i + 1}`,
          geometry: (skinInfo[i].type == 'broad' ?
            'geometry.humanoid.custom' : 'geometry.humanoid.customSlim'),
          texture: uploadedSkins[i].name,
          type: 'free',
        });
  
        en_US += `skin.SkinPackCreator.${skinsJSON.skins[i].localization_name}` +
        `=${skinInfo[i].name}${(i == uploadedSkins.length - 1 ? '' : '\n')}`;
  
        zip.file(uploadedSkins[i].name, uploadedSkins[i]);
      }
  
      zip.file('skins.json', JSON.stringify(skinsJSON));
      zip.file('texts/en_US.lang', en_US);
  
      zip.generateAsync({
        type: 'blob',
        mimeType: 'application/octet-stream',
      })
      .then((content) => {
        saveAs(content, `${manifestJSON.header.name}.mcpack`)
      });
    }
  })();

  document.getElementById('upload-skin').addEventListener(
    'change',
    uploadListener,
  );

  document.getElementById('download-skin-pack').addEventListener(
    'click',
    downloadListener,
  );
})();
