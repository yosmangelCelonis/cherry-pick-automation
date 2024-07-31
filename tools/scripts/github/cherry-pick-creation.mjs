import { execSync } from 'child_process';
import process from 'process';

const handleError = (message) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

export const cherryPick = async (branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix) => {
    try {
        const prJson = JSON.parse(execSync(`gh pr view ${branchPr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());
        const rootCauseJson = JSON.parse(execSync(`gh pr view ${rootCausePr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());

        console.log('PR_JSON:', prJson.id);
        console.log('ROOT_CAUSE_JSON:', rootCauseJson.id);

        if (prJson.id === rootCauseJson.id) {
            handleError('The PR and the root cause have to be different');
        }
        if (prJson.mergedAt === null || prJson.mergeCommit === null || prJson.mergeable !== 'UNKNOWN') {
            handleError('The PR to merge has not been merged to main, please make sure that you are using the right PR id');
        }
        if (rootCauseJson.mergedAt === null || rootCauseJson.mergeCommit === null || rootCauseJson.mergeable !== 'UNKNOWN') {
            handleError('The root cause pr has not been merged to main, please make sure that you are using the right PR id');
        }

        execSync('git fetch --all');
        const branchList = execSync('git branch -r --list "*release*" --format "%(refname:lstrip=3)"').toString();
        console.log('branchList:' , branchList);
        console.log('branchList.includes(`release/${releaseName}`):' , branchList.includes(`release/${releaseName}`));
        console.log('releaseName:' , releaseName);
        if (!branchList.includes(`release/${releaseName}`)) {
            handleError("The branch doesn't exist, please make sure that you are using the correct name. Remember to only specify the name of the branch, for example release/BRANCH-NAME**");
        }

        // Verify release type
        if (releaseType === 'Emergency') {
            console.log('Emergency fix');
        }

        return true;
    } catch (error) {
        handleError(error.message);
    }
};
// Manejo de argumentos de entrada
const [branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix] = process.argv.slice(2);
cherryPick(branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix);