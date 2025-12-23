package com.fei.feiaizerocodedevelopment;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.fei.feiaizerocodedevelopment.mapper")
public class FeiAiZeroCodeDevelopmentApplication {

    public static void main(String[] args) {
        SpringApplication.run(FeiAiZeroCodeDevelopmentApplication.class, args);
    }

}
