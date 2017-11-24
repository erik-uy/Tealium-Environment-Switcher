'use strict';

(function () {

    var _baseUrl = require('./config').url;
    var _container = null;
    var _cookies = [], _defEnvs=['dev','qa','prod'], _custEnvs=[];
    var _profile, _account, _envName, _active;
    var _templates = {
        list: '' +
        '<div class="ccc-popup">' +
        '<div class="ccc-title">Tealium Environment Switcher</div>' +
        '<div class="ccc-account">Account: ' +
        '<input type="text" name="ttes_account" value="{{account}}" class="ccc-value-input">' +
        '<button class="ccc-button ccc-update pull-right">Update</button></div>' +
        '<div class="ccc-account">Profile: ' +
        '<input type="text" name="ttes_profile" value="{{profile}}" class="ccc-value-input">' +
        '<button class="ccc-button ccc-update pull-right">Update</button>' +
        '</div><div class="ccc-account">' +
        '<ul class="ccc-list">{{defaultEnvironments}}</ul>' +
        '<ul class="ccc-list">{{customEnvironments}}</ul>' +
        // '<ul class="ccc-list">{{items}}</ul>' +
        // '<ul class="ccc-list">{{newItem}}</ul>' +

        '<div class="ccc-item">' +
        '<label class="ccc-name" for="newEnvironment">New custom environment: </label>' +
        '<input type="text" class="ccc-new-environment" value="" name="newEnvironment" id="newEnvironment" {{active}}>' +
        '<button class="ccc-button ccc-add pull-right">Add</button>'+
        '</div>'+
        '</div></div>',

        item: '' +
        '<li class="ccc-item">' +
        '<input class="ccc-toggle" type="radio" id="{{toggleId}}" name="ccc-toggle" />' +
        '<label class="ccc-name" for="{{toggleId}}">{{name}}</label>' +
        '<div class="ccc-contents">' +
        '<input class="ccc-value-input" value="{{value}}" name="{{name}}" />' +
        '<button class="ccc-button ccc-update">Update</button>' +
        '<button class="ccc-button ccc-delete">Delete</button>' +
        '</div>' +
        '</li>',



        defEnvs:
        '<li class="ccc-item ccc-env">' +
        '<input class="ccc-value-input" value="//tags.tiqcdn.com/utag/{{account}}/{{profile}}/{{env}}/utag.js" name="{{name}}" style="display:none"/>'+
        '<label label-for="env-{{env}}" class="ccc-button ccc-update" >' +
        '<input type="radio" name="{{name}}" id="env-{{env}}" class="ccc-radio" {{active}}> Switch to {{env}} ' +
        '</label>'+
        '</li>',

        custEnvs: '<li class="ccc-item ccc-env">' +
        '<input class="ccc-value-input" value="//tags.tiqcdn.com/utag/{{account}}/{{profile}}/{{env}}/utag.js" name="{{name}}" style="display:none"/>'+
        '<label label-for="env-{{env}}" class="ccc-button ccc-update" ><input type="radio" name="{{name}}" id="env-{{env}}" class="ccc-radio"  {{active}}> Switch to {{env}} </label>'+
        '<button class="ccc-button ccc-remove pull-right" data-key="{{env}}">Remove</button>' +
        '</li>',

        noCookies: '' +
        '<li class="ccc-item">' +
        '<label class="ccc-name">No cookies on this page.</label>' +
        '</li>'
    };

    function getCookies(key) {
        key = key || /utag_env_.*/;
        return document.cookie.split(';')
        // return as {name, value} pairs
            .map(function (record) {
                var parts = record.trim().split('=');
                return {
                    name: parts[0],
                    value: parts[1]
                };
            })
            // skip empty items (e.g. when no cookies are found)
            .filter(function (cookie) {
                return Boolean(key.test(cookie.name));
            })
            // sort alphabetically
            .sort(function (a, b) {
                return a.name > b.name;
            });
    }

    function setCookie(name, value) {
        document.cookie = name + '=' + value;
    }

    function deleteCookie(name) {
        if (confirm('Will delete cookie named ' + name)) {
            document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
    }

    function getAccount() {
        return _account=(getCookies(/ttes_account/)[0] || {}).value || '';
    }

    function getProfile() {
        return _profile=(getCookies(/ttes_profile/)[0] || {}).value || '';
    }

    function getActive() {
        var activeEnv = getCookies(new RegExp(getEnvPathName()));

        return _active=(activeEnv.length>0?activeEnv:[{}])[0].value||'prod';
    }

    function create() {
        _cookies = getCookies();
        createContainer();
        loadCSS();
        _container.addEventListener('click', handleClick);
    }

    function destroy() {
        document.body.removeChild(_container);
    }

    function createContainer() {
        _container = document.createElement('div');
        _container.classList.add('ccc-wrapper');
        _container.innerHTML = getContents();
        document.body.appendChild(_container);
    }

    function loadCSS() {
        var styleTag = document.createElement('link');
        styleTag.setAttribute('rel', 'stylesheet');
        styleTag.setAttribute('href', _baseUrl + 'cookie_bookmarklet.css');
        _container.appendChild(styleTag);
    }

    function getContents() {
        var itemsMarkup = _templates.noCookies;
        if (_cookies.length) {
            itemsMarkup = _cookies.reduce(function (markup, cookie, index) {
                var m=markup + parseTemplate(_templates.item, {
                        toggleId: 'cccItem' + index,
                        name: cookie.name,
                        value: cookie.value
                    });
                // console.log(arguments);
                // console.log(m);
                return m;
            }, '');
        }
        _account=getAccount();
        _profile=getProfile();
        _active=getActive();

        var envsMarkup=_defEnvs.reduce(function(markup,name, index){
            // console.log(arguments);
            var _pathName=getEnvPathName();

            var m= (markup||'') + parseTemplate(_templates.defEnvs,{
                        account:_account,
                        profile:_profile,
                        env:name,
                        name:_pathName,
                        active:'//tags.tiqcdn.com/utag/'+_account+'/'+_profile+'/'+name+'/utag.js'===_active?'checked':''
                    }
                );
            // console.log(m);
            return m;
        },'');
        // console.log(_defEnvs);
        // console.log(envsMarkup);

        _custEnvs=getCustomEnvironments();

        var custEnvsMarkup=_custEnvs.reduce(function(markup,name, index){
            // console.log(arguments);
            var _pathName=getEnvPathName();

            var m= (markup||'') + parseTemplate(_templates.custEnvs,{
                        account:_account,
                        profile:_profile,
                        env:name,
                        name:_pathName,
                        active:'//tags.tiqcdn.com/utag/'+_account+'/'+_profile+'/'+name+'/utag.js'===_active?'checked':''
                    }
                );
            // console.log(m);
            return m;
        },'');

        // var custEnvsMarkup = parseTemplate(_templates.custEnvs, {custEnvsgetCustomEnvironments()
        return parseTemplate(_templates.list, {
            defaultEnvironments:envsMarkup,
            customEnvironments:custEnvsMarkup,
            items: itemsMarkup,
            account: getAccount(),
            profile:getProfile()
        });
    }

    function getCustomEnvironments(){
        var envs=getCookies(/ttes_custEnvs/);
        envs=envs.length>0?envs:[{}];
        return JSON.parse(decodeURIComponent(envs[0].value||'[]'));
    }

    function getEnvPathName(){
        return 'utag_env_'+_account+'_main';
    }

    function parseTemplate(template, values) {
        for (var key in values) {
            var rx = new RegExp('{{' + key + '}}', 'g');
            template = template.replace(rx, values[key]);
        }
        return template;
    }

    function handleClick(event) {
        if (event.target === event.currentTarget) {
            // click on the container element (gray overlay)
            destroy();
        } else if (event.target.classList.contains('ccc-add')){
            addCustomEnvironment();
        }  else if (event.target.classList.contains('ccc-remove')){
            removeCustomEvent(event);
        } else if (event.target.classList.contains('ccc-button')) {
            handleButtonClick(event.target);
        } else if (event.target.classList.contains('ccc-radio')) {
            event.target.parentNode.click(event);
        } else if (event.target.classList.contains('ccc-env')) {
            // console.log('ccc-env');
            event.target.querySelector('.ccc-button').click(event);
        }
    }

    function handleButtonClick(button) {
        var input = button.parentNode.querySelectorAll('.ccc-value-input')[0];
        if (button.classList.contains('ccc-update')) {
            // click on the Update button
            setCookie(input.name, input.value);
            destroy();
            create();
        } else if (button.classList.contains('ccc-delete')) {
            // click on the Delete button
            deleteCookie(input.name);
        }
    }

    function removeCustomEvent(event){
        // console.log(event.target);
        // var tb = document.querySelector('#newEnvironment');
        _custEnvs.splice(_custEnvs.indexOf(event.target.getAttribute('data-key')),1);
        setCookie('ttes_custEnvs', encodeURI(JSON.stringify(_custEnvs)));
        destroy();
        create();
    }

    function addCustomEnvironment(){
        var tb = document.querySelector('#newEnvironment');
        _custEnvs.push(tb.value);
        setCookie('ttes_custEnvs', encodeURI(JSON.stringify(_custEnvs)));
        destroy();
        create();
    }

    create();

})();
