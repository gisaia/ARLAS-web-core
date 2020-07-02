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

if [[ ! -d ../ARLAS-wui-toolkit/ ]] ; then
    echo 'Directory "../ARLAS-wui-toolkit/" is not there, aborting.'
    exit
fi

if [[ ! -d ../ARLAS-d3/ ]] ; then
    echo 'Directory "../ARLAS-d3/" is not there, aborting.'
    exit
fi

npmlogin=`npm whoami`
if  [ -z "$npmlogin"  ] ; then echo "your are not logged on npm"; exit -1; else  echo "logged as "$npmlogin ; fi

level_version=("major" "minor" "patch")

usage(){
	echo "Usage: ./release.sh -core='1.0.0;major' -cont='1.1.0;minor' -comp='1.1.1;patch' -prod -ref_branch=develop"
	echo "Usage: ./release.sh -all='1.0.0-dev0;minor'"
	echo "Usage: ./release.sh -all='1.0.0;major' -cont='1.1.0;minor'"
	echo " -core|--arlas-web-core     arlas-web-core version release,level of evolution"
	echo " -cont|--arlas-web-contributors      arlas-web-contributors version release, level of evolution"
	echo " -comp|--arlas-web-components    arlas-web-components version release, level of evolution"
	echo " -d3|--arlas-d3    arlas-d3 version release, level of evolution"
    echo " -tool|--arlas-wui-toolkit    arlas-wui-toolkit version release, level of evolution"
	echo " -all|--global    all project have same version release, level of evolution"
    echo " -prod|--production    if present publish on public npm and tag from master git branch, if not publish on gisaia private npm and tag from develop, not present by defaut"
	echo " if -all and -core or -cont or -comp or -d3 parametes are mixed, the specified version is released"
	echo " -ref_branch | --reference_branch  from which branch to start the release."
    echo "    Add -ref_branch=develop for a new official release"
    echo "    Add -ref_branch=x.x.x for a maintenance release"
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

checkfilesize(){
    file=$1
    minimumsize=1
    actualsize=$(wc -c <"$file")
    if [ $actualsize -ge $minimumsize ]; then
        echo  "$file" size is over $minimumsize bytes
    else
        echo "Dist build contains empty js or ts file,  "$file" try again"
        exit 1
    fi
}



releaseProd(){
    local folder="web-core"
    if [ "$3" == "components" ];
        then
        cd ../ARLAS-web-components/
        local folder="web-components"
    elif [ "$3" == "d3" ];
        then
        cd ../ARLAS-d3/
        local folder="d3"
    elif [ "$3" == "contributors" ];
        then
        cd ../ARLAS-web-contributors/
        local folder="web-contributors"
    elif [ "$3" == "toolkit" ];
        then
        cd ../ARLAS-wui-toolkit/
        local folder="wui-toolkit"
    fi

    echo "=> Get "$4" branch of ARLAS-$folder project"
    git checkout "$4"
    git pull origin "$4"
    echo "=> Test to lint and build the project on "$4" branch"
    npm install
    npm run tslint
    npm run build-release
    rm -rf dist

    jq  '.name = "arlas-'$folder'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    jq  '.version = "'"$1"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    git add .
    commit_message_release="Release prod version $1"

    echo "=> Tag version $1"
    npm install
    npm run tslint
    npm run build-release
    #check dist files size
    for file in $(find dist -name '*.js' -or -name '*.ts');
    do
    checkfilesize $file
    done
    cp package-release.json  dist/package.json
    cp README-NPM.md dist/README.md
    cp LICENSE.txt dist/LICENSE
    git tag -a v"$1" -m "$commit_message_release"
    git push origin v"$1"

    echo "=> Generate CHANGELOG"
    docker run -it --rm -v "$(pwd)":/usr/local/src/your-app gisaia/github-changelog-generator:latest github_changelog_generator \
      -u gisaia -p ARLAS-"$folder" --token 479b4f9b9390acca5c931dd34e3b7efb21cbf6d0 --no-pr-wo-labels --no-issues-wo-labels --no-unreleased \
      --issue-line-labels conf,documentation,CI,ALL,DONUT,RESULTLIST,POWERBARS,HISTOGRAM,MAP \
      --exclude-labels type:duplicate,type:question,type:wontfix,type:invalid \
      --bug-labels type:bug --enhancement-labels type:enhancement --breaking-labels type:breaking \
      --enhancement-label "**New stuff:**" --issues-label "**Miscellaneous:**" \
      --exclude-tags v3.1.2 --since-tag v4.0.0

    echo "  -- Remove tag to add generated CHANGELOG"
    git tag -d v"$1"
    git push origin :v"$1"

    echo "  -- Commit release version"
    git commit -a -m "$commit_message_release" --allow-empty
    git tag v"$1"
    git push origin v"$1"
    git push origin "$4"

    cd dist
    jq  '.name = "arlas-'$folder'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    jq  '.version = "'"$1"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    echo "=> Publish to npm"
    npm publish
    cd ..
    rm -rf dist
    if [ "$4" == "develop" ];
        then
        echo "=> Merge develop into master"
        git checkout master
        git pull origin master
        git merge origin/develop
        git push origin master

        git checkout develop
        git pull origin develop
        git rebase origin/master
    fi
    IFS='.' read -ra TAB <<< "$1"
    major=${TAB[0]}
    minor=${TAB[1]}
    newminor=$(( $minor + 1 ))
    newDevVersion=${major}.${newminor}.0
    jq  '.version = "'"$newDevVersion"'-dev0"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    git add .
    commit_message="update package.json to"-"$newDevVersion"
    git commit -m"$commit_message" --allow-empty
    git push origin "$4"
    echo "Well done :)"

}

releaseDev(){
    local folder="web-core"
    if [ "$3" == "components" ];
        then
        cd ../ARLAS-web-components/
        local folder="web-components"
    elif [ "$3" == "d3" ];
        then
        cd ../ARLAS-d3/
        local folder="d3"
    elif [ "$3" == "contributors" ];
        then
        cd ../ARLAS-web-contributors/
        local folder="web-contributors"
    elif [ "$3" == "toolkit" ];
        then
        cd ../ARLAS-wui-toolkit/
        local folder="wui-toolkit"
    fi
    echo "=> Get develop branch of ARLAS-$folder project"
    git checkout  develop
    git pull origin develop
    echo "=> Test to lint and build the project on develop branch"
    npm install
    if [[ -d ./node_modules/@gisaia-team/arlas-web-core ]] ; then
    mv node_modules/@gisaia-team/arlas-web-core node_modules 2>/dev/null
    fi
    npm run tslint
    npm run build-release
    #check dist files size
    for file in $(find dist -name '*.js' -or -name '*.ts');
    do
    checkfilesize $file
    done
    cp package-release.json  dist/package.json
    cp README-NPM.md dist/README.md
    cd dist
    jq  '.name = "@gisaia-team/arlas-'$folder'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    jq  '.version = "'"$1"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    npm publish
    cd ..
    jq  '.version = "'"$1"'"' package.json > tmp.$$.json && mv tmp.$$.json package.json
    rm -rf dist
    git add .
    commit_message_develop="dev automatic release update package.json to"-"$1"
    git commit -m"$commit_message_develop" --allow-empty
    git push origin develop
}

release(){
    if [ "$4" == "true" ];
        then
        releaseProd $1 $2 $3 $5
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
    -d3=*|--arlas-d3=*)
    ARLAS_D3="${i#*=}"
    shift # past argument=value
    ;;
    -tool=*|--arlas-wui-toolkit=*)
    ARLAS_TOOL="${i#*=}"
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
    -ref_branch=*|--reference_branch=*)
    REF_BRANCH="${i#*=}"
    shift # past argument=value
    ;;
    *)
            # unknown option
    ;;
esac
done

if [ -z ${REF_BRANCH+x} ];
    then
        echo ""
        echo "###########"
        echo "-ref_branch is missing."
        echo "  Add -ref_branch=develop for a new official release"
        echo "  Add -ref_branch=x.x.x for a maintenance release"
        echo "###########"
        echo ""
        usage;
fi

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

if [ ! -z ${ARLAS_D3+x} ];
    then
        checkInput ${ARLAS_D3} ${ARLAS_PROD}
        IFS=';' read -ra TABD3 <<< "$ARLAS_D3"
        ARLAS_D3_VERS="${TABD3[0]}";
        ARLAS_D3_LEVEL="${TABD3[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL} ${ARLAS_PROD}
        IFS=';' read -ra TABD3 <<< "$ARLAS_ALL"
        ARLAS_D3_VERS="${TABD3[0]}";
        ARLAS_D3_LEVEL="${TABD3[1]}";
fi

if [ ! -z ${ARLAS_TOOL+x} ];
    then
        checkInput ${ARLAS_TOOL} ${ARLAS_PROD}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_TOOL"
        ARLAS_TOOL_VERS="${TABCOMP[0]}";
        ARLAS_TOOL_LEVEL="${TABCOMP[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL} ${ARLAS_PROD}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_ALL"
        ARLAS_TOOL_VERS="${TABCOMP[0]}";
        ARLAS_TOOL_LEVEL="${TABCOMP[1]}";
fi

if [ ! -z ${ARLAS_CORE_VERS+x} ] && [ ! -z ${ARLAS_CORE_LEVEL+x} ];
    then
        echo "Release ARLAS-web-core  ${ARLAS_CORE_LEVEL} version                    : ${ARLAS_CORE_VERS}";
        release ${ARLAS_CORE_VERS} ${ARLAS_CORE_LEVEL} "core" ${ARLAS_PROD} ${REF_BRANCH}
fi

if [ ! -z ${ARLAS_CONT_VERS+x} ] && [ ! -z ${ARLAS_CONT_LEVEL+x} ];
    then
        echo "Release ARLAS-web-contributors  ${ARLAS_CONT_VERS} version                    : ${ARLAS_CONT_LEVEL}";
        release ${ARLAS_CONT_VERS} ${ARLAS_CONT_LEVEL} "contributors" ${ARLAS_PROD} ${REF_BRANCH}
fi

if [ ! -z ${ARLAS_COMP_VERS+x} ] && [ ! -z ${ARLAS_COMP_LEVEL+x} ];
    then
        echo "Release ARLAS-web-components  ${ARLAS_COMP_VERS} version                    : ${ARLAS_COMP_LEVEL}";
        release ${ARLAS_COMP_VERS} ${ARLAS_COMP_LEVEL} "components" ${ARLAS_PROD} ${REF_BRANCH}
fi

if [ ! -z ${ARLAS_D3_VERS+x} ] && [ ! -z ${ARLAS_D3_LEVEL+x} ];
    then
        echo "Release ARLAS-d3  ${ARLAS_D3_VERS} version                    : ${ARLAS_D3_LEVEL}";
        release ${ARLAS_D3_VERS} ${ARLAS_D3_LEVEL} "d3" ${ARLAS_PROD} ${REF_BRANCH}
fi

if [ ! -z ${ARLAS_TOOL_VERS+x} ] && [ ! -z ${ARLAS_TOOL_LEVEL+x} ];
    then
        echo "Release ARLAS-wui-toolkit  ${ARLAS_TOOL_VERS} version                    : ${ARLAS_TOOL_LEVEL}";
        release ${ARLAS_TOOL_VERS} ${ARLAS_TOOL_LEVEL} "toolkit" ${ARLAS_PROD} ${REF_BRANCH}
fi
