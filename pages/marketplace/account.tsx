import { getSession } from 'next-auth/react';
import { NextSeo } from 'next-seo';
import { FULL_DESCRIPTION, NAME, TITLE } from 'src/constants/marketplace';
import Wrapper from 'src/layouts/marketplace';
export default function Market({ user }) {
    return (<>
        <NextSeo
            title={TITLE}
            description={FULL_DESCRIPTION} />
        <Wrapper user={user}>
            <section className="w-full p-3  mt-4 ">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    Your Account
                </h1>

            </section>



        </Wrapper>
    </>)
}
export async function getServerSideProps(context) {


    const session = await getSession(context);

    if (!session)
        return {
            redirect: {
                destination: '/login',
                permanent: false
            }
        }



    return {
        props: { user: session.user },

    }
}