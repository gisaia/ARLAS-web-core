#!/bin/bash
set -e
if [[ ! -d ../ARLAS-web-contributors/ ]] ; then
    echo 'Directory "../ARLAS-web-contributors/" is not there, aborting.'
    exit
fi

if [[ ! -d ../ARLAS-web-components/ ]] ; then
    echo 'Directory "../ARLAS-web-components/" is not there, aborting.'
    exit
fi

level_version=("major" "minor" "patch")
usage(){ 
	echo "Usage: ./release.sh -core='1.0.0;major' -cont='1.1.0;minor' -comp='1.1.1;patch' -prod"
	echo "Usage: ./release.sh -all='1.0.0-dev0;minor'"
	echo "Usage: ./release.sh -all='1.0.0;major' -cont='1.1.0;minor'"
	echo " -core|--arlas-web-core     arlas-web-core version release,level of evolution"
	echo " -cont|--arlas-web-contributors      arlas-web-contributors version release,level of evolution"
	echo " -comp|--arlas-web-components    arlas-web-components version release,level of evolution"
	echo " -all|--global    all project have same version release,level of evolution"
    echo " -prod|--production    if present publish on public npm and tag from master git branch, if not publish on gisaia private npm and tag from develop, not present by defaut"
	echo " if -all and -core or -cont or comp parametes are mixed, the specified version is released"
	exit 1
}


contains(){
    local n=$#
    local value=${!n}
    for ((i=1;i < $#;i++)) {
        if [ "${!i}" == "${value}" ]; then
            echo "y"
            return 0
        fi
    }
    echo "n"
    return 1
}

checkInput(){
    IFS=';' read -ra TAB <<< "$1"
    TABLEN=${#TAB[@]}
    TWO=2
    if [ "$TABLEN" -ne "$TWO" ];
        then
            usage;
    else 
        if [ $(contains "${level_version[@]}" "${TAB[1]}") == "n" ];
            then
                echo "Unknown level of evolution value : ${TAB[1]}"
                echo "Possible values : "
                echo "   level for versions : ${level_version[*]}"
                usage;
        elif [ "$2" == "true" ];
            then
                if ! [[ ${TAB[0]} =~ ^[0-9]*\.[0-9]*\.[0-9]*$ ]]
                    then
                    echo ""${TAB[0]}" version value is not valid. Format : vX.Y.Z in --prod mode"
                    usage;     
                fi           
        else
            if ! [[ ${TAB[0]} =~ ^[0-9]*\.[0-9]*\.[0-9]*-dev[0-9]*$ ]];
                then
                    echo ""${TAB[0]}" version value is not valid. Format :  vX.Y.Z-devN in dev mode"
                    usage;                
            fi           
        fi
    fi
    
}

releaseProd(){
    if [ "$3" == "components" ]; 
        then
            cd ../ARLAS-web-components/
    elif [ "$3" == "contributors" ]; 
        then 
        cd ../ARLAS-web-contributors/
    fi
    echo "=> Get develop branch of ARLAS-web-$3 project"
    git checkout  develop
    git pull origin develop
    echo "=> Test to lint and build the project on develop branch"
    yarn install
    yarn tslint
    yarn build-release
    rm -rf dist
    echo "=> Merge develop into master"
    git checkout master
    git pull origin master
    git merge develop
    jq  '.name = "arlas-web-'$3'"' package-release.json > tmp.$$.json && mv tmp.$$.json package-release.json
    jq  '.name = "arlas-web-'$3'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    git add .
    commit_message_master="prod automatic release"-"$1"
    git commit -m"$commit_message_master"
    git push origin master
    echo "=> Tag master"
    git tag -a v"$1"
    git push origin "$1"
    yarn install
    yarn tslint
    yarn build-release
    cp package-release.json  dist/package.json
    npm version "$2"
    cd dist
    npm version "$2"
    echo "=> Publish to npm"
    npm publish
    rm -rf dist
    echo "=> Merge master to develop"
    git checkout develop
    git merge master
    IFS='.' read -ra TAB <<< "$1"
    major=${TAB[0]}
    minor=${TAB[1]}
    newminor=$(( $minor + 1 ))
    newDevVersion = ${major}.${newminor}.0
    jq  '.name = "@gisaia/arlas-web-'$3'"' package-release.json > tmp.$$.json && mv tmp.$$.json package-release.json
    jq  '.version = "'"$newDevVersion"'-dev0"' package-release.json > tmp.$$.json && mv tmp.$$.json package-release.json
    jq  '.name = "@gisaia/arlas-web-'$3'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    jq  '.version = "'"$newDevVersion"'-dev0"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    git add .
    commit_message_develop = "upadte package.json to"-"$1"
    git commit -m"$commit_message_develop"
    git push origin develop
}

releaseDev(){ 
    if [ "$3" == "components" ]; 
        then
            cd ../ARLAS-web-components/
    elif [ "$3" == "contributors" ]; 
        then 
        cd ../ARLAS-web-contributors/
    fi
    echo "=> Get develop branch of ARLAS-web-$3 project"
    git checkout  develop
    git pull origin develop
    echo "=> Test to lint and build the project on develop branch"
    yarn install
    yarn tslint
    yarn build-release
    jq  '.name = "@gisaia/arlas-web-"'"$3"'"' package-release.json > tmp.$$.json && mv tmp.$$.json package-release.json
    jq  '.version = "'"$1"'"' package-release.json > tmp.$$.json && mv tmp.$$.json package-release.json
    jq  '.name = "@gisaia/arlas-web-"'"$3"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    jq  '.version = "'"$1"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    cp package-release.json  dist/package.json
    cd dist
    npm publish
    rm -rf dist
    git add .
    commit_message_develop = "dev automatic release upadte package.json to"-"$1"
    git commit -m"$commit_message_develop"
}

release(){
    if [ "$4" == "true" ];
        then
        releaseProd $1 $2 $3
    else
        releaseDev $1 $2 $3
    fi

}

ARLAS_PROD="false"

for i in "$@"
do
case $i in
    -core=*|--arlas-web-core=*)
    ARLAS_CORE="${i#*=}"
    shift # past argument=value
    ;;
    -cont=*|--arlas-web-contributors=*)
    ARLAS_CONT="${i#*=}"
    shift # past argument=value
    ;;
    -comp=*|--arlas-web-components=*)
    ARLAS_COMP="${i#*=}"
    shift # past argument=value
    ;;
    -all=*|--global=*)
    ARLAS_ALL="${i#*=}"
    shift # past argument=value
    ;;
    -h|--help)
    ARLAS_HELP="true"
    shift # past argument=value
    ;;
    -prod|--production)
    ARLAS_PROD="true"
    shift # past argument=value
    ;;
    *)
            # unknown option
    ;;
esac
done

if [ ! -z ${ARLAS_HELP+x} ]; 
    then
        usage;
fi

if [ ! -z ${ARLAS_CORE+x} ]; 
    then
        checkInput ${ARLAS_CORE} ${ARLAS_PROD}
        IFS=';' read -ra TABCORE <<< "$ARLAS_CORE"       
        ARLAS_CORE_VERS="${TABCORE[0]}";
        ARLAS_CORE_LEVEL="${TABCORE[1]}";    
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL} ${ARLAS_PROD}
        IFS=';' read -ra TABCORE <<< "$ARLAS_ALL"       
        ARLAS_CORE_VERS="${TABCORE[0]}";
        ARLAS_CORE_LEVEL="${TABCORE[1]}";   
fi

if [ ! -z ${ARLAS_CONT+x} ]; 
    then
        checkInput ${ARLAS_CONT} ${ARLAS_PROD}
        IFS=';' read -ra TABCONT <<< "$ARLAS_CONT"       
        ARLAS_CONT_VERS="${TABCONT[0]}";
        ARLAS_CONT_LEVEL="${TABCONT[1]}";    
elif [ ! -z ${ARLAS_ALL+x} ];
    then 
        checkInput ${ARLAS_ALL} ${ARLAS_PROD}
        IFS=';' read -ra TABCONT <<< "$ARLAS_ALL"       
        ARLAS_CONT_VERS="${TABCONT[0]}";
        ARLAS_CONT_LEVEL="${TABCONT[1]}";   
fi

if [ ! -z ${ARLAS_COMP+x} ]; 
    then
        checkInput ${ARLAS_COMP} ${ARLAS_PROD}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_COMP"       
        ARLAS_COMP_VERS="${TABCOMP[0]}";
        ARLAS_COMP_LEVEL="${TABCOMP[1]}";    
elif [ ! -z ${ARLAS_ALL+x} ];
    then 
        checkInput ${ARLAS_ALL} ${ARLAS_PROD}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_ALL"       
        ARLAS_COMP_VERS="${TABCOMP[0]}";
        ARLAS_COMP_LEVEL="${TABCOMP[1]}";   
fi

if [ ! -z ${ARLAS_CORE_VERS+x} ] && [ ! -z ${ARLAS_CORE_LEVEL+x} ];
    then 
        echo "Release ARLAS-web-core  ${ARLAS_CORE_LEVEL} version                    : ${ARLAS_CORE_VERS}"; 
        release ${ARLAS_CORE_VERS} ${ARLAS_CORE_LEVEL} "core" ${ARLAS_PROD}
fi

if [ ! -z ${ARLAS_CONT_VERS+x} ] && [ ! -z ${ARLAS_CONT_LEVEL+x} ];
    then 
        echo "Release ARLAS-web-components  ${ARLAS_CONT_VERS} version                    : ${ARLAS_CONT_LEVEL}"; 
        release ${ARLAS_CONT_VERS} ${ARLAS_CONT_LEVEL} "contributors" ${ARLAS_PROD}
fi

if [ ! -z ${ARLAS_COMP_VERS+x} ] && [ ! -z ${ARLAS_COMP_LEVEL+x} ];
    then  
        echo "Release ARLAS-web-contributors  ${ARLAS_COMP_VERS} version                    : ${ARLAS_COMP_LEVEL}"; 
        release ${ARLAS_COMP_VERS} ${ARLAS_COMP_LEVEL} "components" ${ARLAS_PROD}
fi
